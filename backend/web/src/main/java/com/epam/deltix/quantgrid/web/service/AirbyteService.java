package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.config.DialToken;
import com.epam.deltix.quantgrid.web.config.SyncSettings;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.YamlUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.IntNode;
import com.fasterxml.jackson.databind.node.LongNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kubernetes.client.openapi.ApiException;
import io.kubernetes.client.openapi.models.V1ConfigMap;
import io.kubernetes.client.openapi.models.V1ContainerStateTerminated;
import io.kubernetes.client.openapi.models.V1ContainerStatus;
import io.kubernetes.client.openapi.models.V1ObjectMeta;
import io.kubernetes.client.openapi.models.V1Pod;
import io.kubernetes.client.openapi.models.V1PodStatus;
import io.kubernetes.client.openapi.models.V1Secret;
import io.kubernetes.client.util.Yaml;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Validate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Future;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.PostConstruct;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class AirbyteService {
    private static final int MAX_ERROR_LOG_LINES = 20;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Resource specPod;
    private final Resource discoverSecret;
    private final Resource discoverPod;
    private final Resource syncSecret;
    private final Resource syncConfigMap;
    private final Resource syncPod;
    private final String dialBaseUrl;
    private final SyncSettings settings;
    private final ClusterSettings clusterSettings;
    private final KubernetesService kubernetesService;
    private final Map<String, SyncSettings.AirbyteDefinition> sourceDefinitions;
    private final Engine engine;
    private final TaskScheduler taskScheduler;
    private final Clock clock;

    public AirbyteService(
            @Value("classpath:kubernetes/spec/pod.yaml") Resource specPod,
            @Value("classpath:kubernetes/discover/secret.yaml") Resource discoverSecret,
            @Value("classpath:kubernetes/discover/pod.yaml") Resource discoverPod,
            @Value("classpath:kubernetes/sync/secret.yaml") Resource syncSecret,
            @Value("classpath:kubernetes/sync/config-map.yaml") Resource syncConfigMap,
            @Value("classpath:kubernetes/sync/pod.yaml") Resource syncPod,
            @Value("${web.storage.dial.baseUrl}") String dialBaseUrl,
            SyncSettings settings,
            ClusterSettings clusterSettings,
            KubernetesService kubernetesService,
            Engine engine,
            TaskScheduler taskScheduler,
            Clock clock) {
        this.specPod = specPod;
        this.discoverSecret = discoverSecret;
        this.discoverPod = discoverPod;
        this.syncSecret = syncSecret;
        this.syncConfigMap = syncConfigMap;
        this.syncPod = syncPod;
        this.dialBaseUrl = dialBaseUrl;
        this.settings = settings;
        this.clusterSettings = clusterSettings;
        this.kubernetesService = kubernetesService;
        this.sourceDefinitions = settings.airbyte().sourceDefinitions().stream()
                .filter(SyncSettings.AirbyteDefinition::enabled)
                .collect(Collectors.toMap(SyncSettings.AirbyteDefinition::id, Function.identity(), (a, b) -> {
                    throw new IllegalStateException("Duplicate source definition id: " + a);
                }, LinkedHashMap::new));
        this.engine = engine;
        this.taskScheduler = taskScheduler;
        this.clock = clock;
    }

    @PostConstruct
    public void init() {
        taskScheduler.scheduleWithFixedDelay(this::cleanup, settings.airbyte().k8s().cleanupInterval());
    }

    private void cleanup() {
        SyncSettings.Kubernetes kubernetes = settings.airbyte().k8s();
        log.info("Starting Airbyte resources cleanup in namespace '{}' with purpose '{}'",
                kubernetes.namespace(), kubernetes.purpose());
        for (V1Pod pod : kubernetesService.lookupPods(kubernetes.namespace(), kubernetes.purpose())) {
            V1PodStatus status = pod.getStatus();
            if (status == null) {
                continue;
            }

            String phase = status.getPhase();
            if ("Pending".equals(phase) || "Running".equals(phase)) {
                continue;
            }

            V1ObjectMeta metadata = pod.getMetadata();
            if (metadata == null || metadata.getDeletionTimestamp() != null) {
                continue;
            }

            safeDeletePod(metadata.getName());
        }

        for (V1Secret secret : kubernetesService.lookupSecrets(kubernetes.namespace(), kubernetes.purpose())) {
            V1ObjectMeta metadata = secret.getMetadata();
            if (metadata == null || metadata.getDeletionTimestamp() != null) {
                continue;
            }

            if (isResourceExpired(metadata)) {
                safeDeleteSecret(metadata.getName());
            }
        }

        for (V1ConfigMap configMap : kubernetesService.lookupConfigMaps(kubernetes.namespace(), kubernetes.purpose())) {
            V1ObjectMeta metadata = configMap.getMetadata();
            if (metadata == null || metadata.getDeletionTimestamp() != null) {
                continue;
            }

            if (isResourceExpired(metadata)) {
                safeDeleteConfigMap(metadata.getName());
            }
        }
        log.info("Completed Airbyte resources cleanup in namespace '{}' with purpose '{}'",
                kubernetes.namespace(), kubernetes.purpose());
    }

    private boolean isResourceExpired(V1ObjectMeta metadata) {
        OffsetDateTime creationTimestamp = metadata.getCreationTimestamp();
        if (creationTimestamp == null) {
            return false;
        }

        Map<String, String> annotations = metadata.getAnnotations();
        if (annotations == null) {
            return false;
        }

        long ttl;
        try {
            ttl = Long.parseLong(annotations.get("cleanup/ttl-seconds"));
        } catch (NumberFormatException e) {
            log.warn("Invalid TTL for resource {}: {}", metadata.getName(), e.getMessage());
            return false;
        }

        return clock.instant().isAfter(creationTimestamp.plusSeconds(ttl).toInstant());
    }

    public Set<String> getAvailableSources() {
        return sourceDefinitions.keySet();
    }

    public String getSourceName(String id) {
        SyncSettings.AirbyteDefinition definition = sourceDefinitions.get(id);
        Validate.notNull(definition, "Source definition not found for id: %s", id);
        return definition.name();
    }

    @Cacheable("airbyte-specs")
    @SneakyThrows
    public String spec(String id) {
        SyncSettings.AirbyteDefinition definition = sourceDefinitions.get(id);
        Validate.notNull(definition, "Source definition not found for id: %s", id);
        String name = "spec-" + randomSuffix();
        SyncSettings.Kubernetes kubernetes = settings.airbyte().k8s();
        int ttl = getOperationTtlInSeconds();
        V1Pod pod = load(specPod, Map.of(
                "name", name,
                "purpose", kubernetes.purpose(),
                "pull_secrets", imagePullSecrets(definition.secret()),
                "pull_policy", kubernetes.pullPolicy(),
                "image", definition.image(),
                "ttl", ttl), V1Pod.class);

        try {
            kubernetesService.createPod(pod, kubernetes.namespace());
            kubernetesService.waitForPodCompletion(name, kubernetes.namespace(), ttl);
            String logs = kubernetesService.getPodLogs(name, kubernetes.namespace());
            JsonNode spec = extractSingleField(logs, "SPEC", "spec").path("connectionSpecification");
            replaceAirbyteSecret(spec);
            return print(spec);
        } catch (PodFailedException e) {
            String logs = kubernetesService.getPodLogs(name, null, kubernetes.namespace(), MAX_ERROR_LOG_LINES);
            String error = extractAirbyteError(logs);
            if (error != null) {
                throw new IllegalStateException("Failed to get spec: " + error, e);
            }

            throw new IllegalStateException("Failed to get spec, pod logs:\n" + logs, e);
        } finally {
            safeDeletePod(name);
        }
    }

    @SneakyThrows
    public List<DataStream> discover(String id, String configJson) {
        SyncSettings.AirbyteDefinition definition = sourceDefinitions.get(id);
        Validate.notNull(definition, "Source definition not found for id: %s", id);

        String suffix = randomSuffix();
        String podName = "discover-" + suffix;
        String secretName = "discover-secret-" + suffix;
        SyncSettings.Kubernetes kubernetes = settings.airbyte().k8s();
        int ttl = getOperationTtlInSeconds();

        V1Secret secret = load(discoverSecret, Map.of(
                "name", secretName,
                "purpose", kubernetes.purpose(),
                "job_id", podName,
                "config", normalizeJson(configJson),
                "ttl", ttl), V1Secret.class);

        V1Pod pod = load(discoverPod, Map.of(
                "name", podName,
                "purpose", kubernetes.purpose(),
                "pull_secrets", imagePullSecrets(definition.secret()),
                "pull_policy", kubernetes.pullPolicy(),
                "image", definition.image(),
                "secret", secretName,
                "ttl", ttl), V1Pod.class);

        try {
            kubernetesService.createSecret(secret, kubernetes.namespace());
            kubernetesService.createPod(pod, kubernetes.namespace());
            kubernetesService.waitForPodCompletion(podName, kubernetes.namespace(), ttl);

            String logs = kubernetesService.getPodLogs(podName, kubernetes.namespace());
            JsonNode catalog = extractSingleField(logs, "CATALOG", "catalog");
            List<DataStream> streams = new ArrayList<>();
            catalog.path("streams").forEach(stream -> {
                String name = stream.path("name").asText();
                String namespace = stream.path("namespace").asText(null);
                JsonNode schema = stream.path("json_schema");
                streams.add(new DataStream(namespace, name, schema));
            });
            return streams;
        } catch (PodFailedException e) {
            String logs = kubernetesService.getPodLogs(podName, null, kubernetes.namespace(), MAX_ERROR_LOG_LINES);
            String error = extractAirbyteError(logs);
            if (error != null) {
                throw new IllegalStateException("Failed to discover schema: " + error, e);
            }

            throw new IllegalStateException("Failed to discover schema, pod logs:\n" + logs, e);
        } finally {
            safeDeletePod(podName);
            safeDeleteSecret(secretName);
        }
    }

    @SneakyThrows
    public ComputeService.ComputeTask startSync(
            String id,
            String configJson,
            DataStream stream,
            String target,
            String suffix,
            Principal principal,
            ComputeService.ComputeCallback callback) {
        SyncSettings.AirbyteDefinition definition = sourceDefinitions.get(id);
        Validate.notNull(definition, "Source definition not found for id: %s", id);

        String podName = "sync-" + suffix;
        String configName = "sync-config-" + suffix;
        String sourceSecretName = "sync-source-secret-" + suffix;
        String destinationSecretName = "sync-destination-secret-" + suffix;
        SyncSettings.Kubernetes kubernetes = settings.airbyte().k8s();
        int ttl = getOperationTtlInSeconds();

        V1ConfigMap configMap = load(syncConfigMap, Map.of(
                "name", configName,
                "purpose", kubernetes.purpose(),
                "job_id", podName,
                "catalog", print(toAirbyteCatalog(stream)),
                "ttl", ttl), V1ConfigMap.class);
        V1Secret sourceSecret = load(syncSecret, Map.of(
                "name", sourceSecretName,
                "purpose", kubernetes.purpose(),
                "job_id", podName,
                "config", normalizeJson(configJson),
                "ttl", ttl), V1Secret.class);
        V1Secret destinationSecret = load(syncSecret, Map.of(
                "name", destinationSecretName,
                "purpose", kubernetes.purpose(),
                "job_id", podName,
                "config", print(toDestinationSecret(target, principal)),
                "ttl", ttl), V1Secret.class);

        V1Pod pod = load(syncPod, Map.of(
                "name", podName,
                "purpose", kubernetes.purpose(),
                "pull_secrets", imagePullSecrets(definition.secret(), settings.airbyte().destinationSecret()),
                "pull_policy", kubernetes.pullPolicy(),
                "source_image", definition.image(),
                "destination_image", settings.airbyte().destinationImage(),
                "config", configName,
                "source_secret", sourceSecretName,
                "destination_secret", destinationSecretName,
                "ttl", ttl), V1Pod.class);

        Future<?> future = engine.getExecutorService().submit(() -> {
            try {
                kubernetesService.createConfigMap(configMap, kubernetes.namespace());
                kubernetesService.createSecret(sourceSecret, kubernetes.namespace());
                kubernetesService.createSecret(destinationSecret, kubernetes.namespace());
                kubernetesService.createPod(pod, kubernetes.namespace());
                kubernetesService.waitForPodCompletion(podName, kubernetes.namespace(), ttl);
                callback.onComplete();
            } catch (PodFailedException podException) {
                callback.onFailure(enrichSyncPodException(podName, kubernetes.namespace(), podException.getStatus()));
            } catch (Throwable e) {
                callback.onFailure(e);
            } finally {
                if (!Thread.interrupted()) {
                    safeDeletePod(podName);
                    safeDeleteConfigMap(configName);
                    safeDeleteSecret(sourceSecretName);
                    safeDeleteSecret(destinationSecretName);
                }
            }
        });

        return () -> {
            future.cancel(true);
            safeDeletePod(podName);
            safeDeleteConfigMap(configName);
            safeDeleteSecret(sourceSecretName);
            safeDeleteSecret(destinationSecretName);
        };
    }

    private ObjectNode toDestinationSecret(String target, Principal principal) {
        ObjectNode result = MAPPER.createObjectNode();
        result.put("url", URI.create(dialBaseUrl).resolve("/v1/").resolve(target).toString());
        DialToken dialToken = (DialToken) principal;
        result.put("header_name", dialToken.getKey());
        result.put("header_value", dialToken.getValue());
        return result;
    }

    private static ObjectNode toAirbyteCatalog(DataStream dataStream) {
        ObjectNode result = MAPPER.createObjectNode();
        ArrayNode streams = result.putArray("streams");
        ObjectNode configuredStream = streams.addObject();
        ObjectNode stream = configuredStream.putObject("stream");
        stream.put("name", dataStream.name());
        stream.set("json_schema", dataStream.schema());
        if (StringUtils.isNotBlank(dataStream.namespace())) {
            stream.put("namespace", dataStream.namespace());
        }
        ArrayNode syncModes = stream.putArray("supported_sync_modes");
        syncModes.add("full_refresh");

        configuredStream.put("sync_mode", "full_refresh");
        configuredStream.put("destination_sync_mode", "overwrite");
        return result;
    }

    public record DataStream(String namespace, String name, JsonNode schema) {
        public static DataStream fromDataSchema(String dataset, DataSchema dataSchema) {
            String[] parts = dataset.split("/");
            if (parts.length > 2) {
                throw new IllegalArgumentException("Invalid stream name: " + dataset);
            }
            ObjectNode schema = MAPPER.createObjectNode();
            schema.put("type", "object");
            ObjectNode properties = schema.putObject("properties");
            for (DataSchema.Column column : dataSchema.getColumns().values()) {
                ObjectNode property = properties.putObject(column.getColumn());
                property.put("type", column.getType());
            }

            return parts.length == 2
                    ? new DataStream(parts[0], parts[1], schema)
                    : new DataStream(null, dataset, schema);
        }

        public DataSchema toDataSchema() {
            JsonNode properties = schema.path("properties");
            DataSchema result = new DataSchema();
            properties.fieldNames().forEachRemaining(name -> {
                String type = resolveType(properties.get(name).path("type"));
                result.addColumn(new DataSchema.Column(name, type, getInputColumnType(type)));
            });

            return result;
        }

        private static String resolveType(JsonNode type) {
            if (type.isTextual()) {
                return type.asText();
            }

            if (type.isArray()) {
                if (type.isEmpty()) {
                    return "string";
                }

                for (JsonNode item : type) {
                    if (!"null".equals(item.asText())) {
                        return item.asText();
                    }
                }

                return type.get(0).asText();
            }

            throw new IllegalArgumentException("Invalid type node: " + type);
        }

        private static InputColumnType getInputColumnType(String type) {
            return switch (type) {
                case "number" -> InputColumnType.DOUBLE;
                case "boolean" -> InputColumnType.BOOLEAN;
                default -> InputColumnType.STRING;
            };
        }

        public String toDatasetName() {
            return StringUtils.isBlank(namespace)
                    ? name
                    : namespace + "/" + name;
        }
    }

    private static String randomSuffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private JsonNode extractSingleField(String logs, String type, String fieldName) {
        List<JsonNode> records = getRecords(logs)
                .filter(node -> type.equals(node.path("type").asText()))
                .map(node -> node.path(fieldName))
                .limit(2)
                .toList();

        Validate.isTrue(!records.isEmpty(), "No records of type %s found in logs", type);
        Validate.isTrue(records.size() == 1, "Multiple records of type %s found in logs", type);

        return records.get(0);
    }

    private <T> T load(Resource template, Map<String, Object> parameters, Class<T> clazz) throws IOException {
        String rendered = YamlUtils.format(template.getContentAsString(StandardCharsets.UTF_8), parameters);
        return Yaml.loadAs(rendered, clazz);
    }

    @SneakyThrows
    private static JsonNode readTree(String line) {
        return MAPPER.readTree(line);
    }

    @SneakyThrows
    private static String print(JsonNode object) {
        return MAPPER.writeValueAsString(object);
    }

    private static String normalizeJson(String input) throws IOException {
        JsonNode json = MAPPER.readTree(input);
        Deque<JsonNode> stack = new ArrayDeque<>();
        stack.push(json);

        while (!stack.isEmpty()) {
            JsonNode node = stack.pop();

            if (node.isObject()) {
                ObjectNode objectNode = (ObjectNode) node;
                objectNode.fieldNames().forEachRemaining(name -> {
                    JsonNode child = objectNode.get(name);
                    if (child.isNumber()) {
                        JsonNode normalized = normalizeNumber(child);
                        if (normalized != child) {
                            objectNode.set(name, normalized);
                        }
                    } else if (child.isContainerNode()) {
                        stack.push(child);
                    }
                });
            } else if (node.isArray()) {
                ArrayNode arrayNode = (ArrayNode) node;
                for (int i = 0; i < arrayNode.size(); i++) {
                    JsonNode child = arrayNode.get(i);
                    if (child.isNumber()) {
                        JsonNode normalized = normalizeNumber(child);
                        if (normalized != child) {
                            arrayNode.set(i, normalized);
                        }
                    } else if (child.isContainerNode()) {
                        stack.push(child);
                    }
                }
            }
        }

        return print(json);
    }

    private static JsonNode normalizeNumber(JsonNode node) {
        if (node.isFloatingPointNumber()) {
            if (node.canConvertToInt()) {
                return new IntNode(node.intValue());
            }

            if (node.canConvertToLong()) {
                return new LongNode(node.longValue());
            }
        }

        return node;
    }

    private static void replaceAirbyteSecret(JsonNode node) {
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if (object.has("airbyte_secret")) {
                object.set("writeOnly", object.remove("airbyte_secret"));
            }
            object.fields().forEachRemaining(entry -> replaceAirbyteSecret(entry.getValue()));
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                replaceAirbyteSecret(child);
            }
        }
    }

    private void safeDeletePod(String name) {
        String namespace = settings.airbyte().k8s().namespace();
        safe(() -> kubernetesService.deletePod(name, namespace), "delete pod " + name);
    }

    private void safeDeleteConfigMap(String name) {
        String namespace = settings.airbyte().k8s().namespace();
        safe(() -> kubernetesService.deleteConfigMap(name, namespace), "delete config map " + name);
    }

    private void safeDeleteSecret(String name) {
        String namespace = settings.airbyte().k8s().namespace();
        safe(() -> kubernetesService.deleteSecret(name, namespace), "delete secret " + name);
    }

    private static void safe(ThrowingRunnable action, String description) {
        try {
            action.run();
        } catch (Exception e) {
            if (e instanceof ApiException apiException && apiException.getCode() == 404) {
                log.info("Resource to {} not found, skipping", description);
                return;
            }
            log.warn("Failed to {}: {}", description, e.getMessage());
        }
    }

    private static String extractAirbyteError(String logs) {
        return getRecords(logs)
                .reduce(
                        null,
                        (error, node) -> error == null ? extractErrorFromRecord(node) : error,
                        (first, next) -> next);
    }

    private static Stream<JsonNode> getRecords(String logs) {
        return logs.lines()
                .map(String::trim)
                .filter(line -> line.startsWith("{"))
                .map(AirbyteService::readTree);
    }

    private static String extractErrorFromRecord(JsonNode node) {
        JsonNode type = node.path("type");
        if (type.isMissingNode()) {
            return null;
        }

        if ("LOG".equals(type.asText())) {
            JsonNode log = node.path("log");
            if ("ERROR".equals(log.path("level").asText())) {
                return log.path("message").asText();
            }

            return null;
        }

        // Traces should contain errors but not always helpful as may refer to logs for details
        // hence checking LOGs first
        if ("TRACE".equals(type.asText())) {
            JsonNode trace = node.path("trace");
            if ("ERROR".equals(trace.path("type").asText())) {
                JsonNode error = trace.path("error");
                return error.path("message").asText();
            }
        }

        return null;
    }

    private Exception enrichSyncPodException(String podName, String namespace, V1PodStatus status) {
        try {
            if (status.getInitContainerStatuses() != null) {
                for (V1ContainerStatus containerStatus : status.getInitContainerStatuses()) {
                    if (containerStatus.getState() != null
                            && containerStatus.getState().getTerminated() != null
                            && containerStatus.getState().getTerminated().getExitCode() != 0) {
                        String logs = kubernetesService.getPodLogs(
                                podName, containerStatus.getName(), namespace, MAX_ERROR_LOG_LINES);
                        return new IllegalStateException(buildContainerErrorMessage(
                                containerStatus.getName(), containerStatus.getState().getTerminated(), logs));
                    }
                }
            } else {
                log.warn("No init container status found in sync pod");
            }

            if (status.getContainerStatuses() != null) {
                for (V1ContainerStatus containerStatus : status.getContainerStatuses()) {
                    if (containerStatus.getState() != null
                            && containerStatus.getState().getTerminated() != null
                            && containerStatus.getState().getTerminated().getExitCode() != 0) {
                        String logs = kubernetesService.getPodLogs(podName, containerStatus.getName(), namespace, MAX_ERROR_LOG_LINES);
                        String error = extractAirbyteError(logs);
                        if (!StringUtils.isBlank(error)) {
                            return new IllegalStateException("Sync pod failed: " + error);
                        }

                        return new IllegalStateException(buildContainerErrorMessage(
                                        containerStatus.getName(), containerStatus.getState().getTerminated(), logs));
                    }
                }
            } else {
                log.warn("No container status found in sync pod");
            }
        } catch (Throwable e) {
            return new IllegalStateException("Sync pod failed, additionally failed to get error logs: " + e.getMessage(), e);
        }

        return new IllegalStateException("Sync pod failed. No container failures found in pod status");
    }

    private int getOperationTtlInSeconds() {
        return Math.toIntExact(clusterSettings.getNodeOperationTimeout() / 1000);
    }

    private static String buildContainerErrorMessage(String name, V1ContainerStateTerminated terminated, String logs) {
        return "Container " + name + " terminated with exit code "
                + terminated.getExitCode()
                + ", reason: " + terminated.getReason()
                + (terminated.getMessage() != null ? ", message: " + terminated.getMessage() : "")
                + ", logs:\n" + logs;
    }

    private static List<Map<String, Object>> imagePullSecrets(String... secrets) {
        return Stream.of(secrets)
                .filter(StringUtils::isNotBlank)
                .distinct()
                .map(name -> Map.of("name", (Object) name))
                .toList();
    }

    @FunctionalInterface
    private interface ThrowingRunnable {
        void run() throws Exception;
    }
}