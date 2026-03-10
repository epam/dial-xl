package com.epam.deltix.quantgrid.web.service.input;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider.Source;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider.Sources;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider.Sync;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider.Syncs;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.service.AirbyteService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.quantgrid.input.api.DataCatalog;
import com.epam.quantgrid.input.api.DataDefinition;
import com.epam.quantgrid.input.api.DataInput;
import com.google.protobuf.Message;
import com.google.protobuf.MessageOrBuilder;
import com.google.protobuf.Struct;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.epam.deltix.proto.Api;
import org.redisson.api.RLock;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.FileNotFoundException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider.MAPPER;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class ImportService {

    private final ConcurrentHashMap<String, ComputeService.ComputeTask> tasks = new ConcurrentHashMap<>();

    private final String namespace;
    private final ImportRegistry registry;
    private final DialFileApi dial;
    private final DialImportProvider provider;
    private final RedissonClient redis;
    private final ComputeService computer;
    private final RTopic topic;
    private final AirbyteService airbyteService;

    public ImportService(ClusterSettings settings, ImportRegistry registry,
                         DialFileApi dial, DialImportProvider provider,
                         RedissonClient redis, ComputeService computer,
                         AirbyteService airbyteService) {
        this.namespace = settings.getNamespace();
        this.registry = registry;
        this.dial = dial;
        this.provider = provider;
        this.redis = redis;
        this.computer = computer;
        this.topic = redis.getTopic(namespace + ".project_import_sync_topic");
        this.topic.addListener(String.class, this::onMessage);
        this.airbyteService = airbyteService;
    }

    public long timeout() {
        return computer.timeout();
    }

    public Api.Response getImportDefinitions(Principal principal, Api.Request apiRequest) {
        Api.ImportDefinitionList request = apiRequest.getImportDefinitionListRequest();
        verifyPresent(request.getProject(), "Project is missing");

        Api.ImportDefinitions.Builder response = Api.ImportDefinitions.newBuilder();

        for (DataDefinition definition : registry.getDefinitions()) {
            Api.ImportDefinition item = Api.ImportDefinition.newBuilder()
                    .setDefinition(definition.getId())
                    .setName(definition.getTitle())
                    .build();
            response.putDefinitions(definition.getId(), item);
        }

        for (String definition : airbyteService.getAvailableSources()) {
            Api.ImportDefinition item = Api.ImportDefinition.newBuilder()
                    .setDefinition(definition)
                    .setName(airbyteService.getSourceName(definition))
                    .build();
            response.putDefinitions(definition, item);
        }

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportDefinitions(response)
                .build();
    }

    public Api.Response getImportDefinition(Principal principal, Api.Request apiRequest) {
        Api.ImportDefinitionGet request = apiRequest.getImportDefinitionGetRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getDefinition(), "Definition is missing");

        Api.ImportDefinition.Builder response = Api.ImportDefinition.newBuilder();
        DataDefinition definition = registry.getDefinition(request.getDefinition());
        String specJson;
        if (definition != null) {
            specJson = definition.toJson();
            response.setName(definition.getTitle());
        } else {
            specJson = airbyteService.spec(request.getDefinition());
            response.setName(airbyteService.getSourceName(request.getDefinition()));
        }

        response.setDefinition(request.getDefinition());
        response.setSpecification(ApiMessageMapper.fromJson(specJson, Struct.newBuilder()));

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportDefinition(response)
                .build();
    }

    public Api.Response getImportSources(Principal principal, Api.Request apiRequest) {
        Api.ImportSourceList request = apiRequest.getImportSourceListRequest();
        verifyPresent(request.getProject(), "Project is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Sources sources = provider.loadSources(principal, folder);
        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportSources(toApi(sources, Api.ImportSources.newBuilder()))
                .build();
    }

    public Api.Response getImportSource(Principal principal, Api.Request apiRequest) {
        Api.ImportSourceGet request = apiRequest.getImportSourceGetRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Sources sources = provider.loadSources(principal, folder);
        Source source = sources.getSources().get(request.getSource());

        verifyFound(source, "Source is not found");

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportSource(toApi(source, Api.ImportSource.newBuilder()))
                .build();
    }

    @SneakyThrows
    public Api.Response createImportSource(Principal principal, Api.Request apiRequest) {
        Api.ImportSourceCreate request = apiRequest.getImportSourceCreateRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getDefinition(), "Definition is missing");
        verifyPresent(request.getName(), "Name is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, true);

        RLock lock = getProjectLock(file);
        lock.lock();

        try {
            Source source = fromApi(request, Source.class);
            source.setSource(generateId());

            Sources sources = provider.loadSources(principal, folder);
            boolean duplicate = sources.getSources().values().stream()
                    .anyMatch(candidate -> source.getName().equals(candidate.getName()));

            if (duplicate) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is already used");
            }

            sources.getSources().put(source.getSource(), source);
            provider.saveSources(principal, folder, sources);

            return Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setImportSource(toApi(source, Api.ImportSource.newBuilder()))
                    .build();
        } finally {
            lock.unlock();
        }
    }

    public Api.Response updateImportSource(Principal principal, Api.Request apiRequest) {
        Api.ImportSourceUpdate request = apiRequest.getImportSourceUpdateRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");
        verifyPresent(request.getName(), "Name is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, true);

        RLock lock = getProjectLock(file);
        lock.lock();

        try {
            Source source = fromApi(request, Source.class);
            Sources sources = provider.loadSources(principal, folder);

            Source existing = sources.getSources().remove(source.getSource());
            verifyFound(existing, "Source is not found");

            boolean duplicate = sources.getSources().values().stream()
                    .anyMatch(candidate -> source.getName().equals(candidate.getName()));

            if (duplicate) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is already used");
            }

            source.setDefinition(existing.getDefinition());
            sources.getSources().put(source.getSource(), source);
            provider.saveSources(principal, folder, sources);

            return Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setImportSource(toApi(source, Api.ImportSource.newBuilder()))
                    .build();
        } finally {
            lock.unlock();
        }
    }

    public Api.Response deleteImportSource(Principal principal, Api.Request apiRequest) {
        Api.ImportSourceDelete request = apiRequest.getImportSourceDeleteRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, true);

        RLock lock = getProjectLock(file);
        lock.lock();

        try {
            String source = request.getSource();
            Sources sources = provider.loadSources(principal, folder);
            Source removed = sources.getSources().remove(source);

            verifyFound(removed, "Source is not found");
            provider.saveSources(principal, folder, sources);

            return Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setImportSource(toApi(removed, Api.ImportSource.newBuilder()))
                    .build();
        } finally {
            lock.unlock();
        }
    }

    @SneakyThrows
    public Api.Response testImportConnection(Principal principal, Api.Request apiRequest) {
        Api.ImportConnectionTest request = apiRequest.getImportConnectionTestRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getDefinition(), "Definition is missing");

        String file = provider.getProjectFile(request.getProject());
        checkPermissions(principal, file, true);

        Source source = fromApi(request, Source.class);
        String configJson = MAPPER.writeValueAsString(source.getConfiguration());

        Api.ImportConnection.Builder response = Api.ImportConnection.newBuilder();
        response.setDefinition(request.getDefinition());

        try {
            DataDefinition definition = registry.getDefinition(request.getDefinition());
            if (definition != null) {
                DataInput input = registry.createInput(principal, source.getDefinition(), configJson);
                input.getCatalog(null);
            } else {
                airbyteService.discover(source.getDefinition(), configJson);
            }

            response.setResult(Api.ImportConnection.Result.SUCCESS);
        } catch (Throwable e) {
            log.info("Failed to test import connection", e);
            response.setResult(Api.ImportConnection.Result.FAILURE);
            response.setError(e.getMessage() == null ? "Unknown error" : e.getMessage());
        }

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportConnection(response)
                .build();
    }

    @SneakyThrows
    public Api.Response getImportCatalog(Principal principal, Api.Request apiRequest) {
        Api.ImportCatalogList request = apiRequest.getImportCatalogListRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Sources sources = provider.loadSources(principal, folder);
        Source source = sources.getSources().get(request.getSource());
        verifyFound(source, "Source is not found");

        String configJson = MAPPER.writeValueAsString(source.getConfiguration());
        Api.ImportCatalog.Builder response = Api.ImportCatalog.newBuilder();
        DataDefinition definition = registry.getDefinition(source.getDefinition());
        if (definition != null) {
            DataInput input = registry.createInput(principal, source.getDefinition(), configJson);
            DataCatalog catalog = input.getCatalog(request.getToken());
            for (DataCatalog.Dataset dataset : catalog.getDatasets()) {
                response.putDatasets(dataset.getPath(),
                        Api.ImportDataset.newBuilder()
                                .setDefinition(source.getDefinition())
                                .setSource(source.getSource())
                                .setDataset(dataset.getPath())
                                .build());
            }
            if (StringUtils.isNotBlank(catalog.getNext())) {
                response.setNext(catalog.getNext());
            }
        } else {
            List<AirbyteService.DataStream> streams = airbyteService.discover(source.getDefinition(), configJson);
            for (AirbyteService.DataStream stream : streams) {
                Api.ImportDataset dataset = Api.ImportDataset.newBuilder()
                        .setDefinition(source.getDefinition())
                        .setSource(source.getSource())
                        .setDataset(stream.toDatasetName())
                        .build();
                response.putDatasets(dataset.getDataset(), dataset);
            }
        }

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportCatalog(response)
                .build();
    }

    @SneakyThrows
    public Api.Response discoverImportDataset(Principal principal, Api.Request apiRequest) {
        Api.ImportDatasetDiscover request = apiRequest.getImportDatasetDiscoverRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");
        verifyPresent(request.getDataset(), "Dataset is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Sources sources = provider.loadSources(principal, folder);
        Source source = sources.getSources().get(request.getSource());
        verifyFound(source, "Source is not found");

        String configJson = MAPPER.writeValueAsString(source.getConfiguration());

        DataDefinition definition = registry.getDefinition(source.getDefinition());
        DataSchema schema;
        if (definition != null) {
            DataInput input = registry.createInput(principal, source.getDefinition(), configJson);
            schema = input.getSchema(request.getDataset());
        } else {
            List<AirbyteService.DataStream> streams =
                    airbyteService.discover(source.getDefinition(), configJson).stream()
                            .filter(stream -> stream.toDatasetName().equals(request.getDataset()))
                            .limit(2)
                            .toList();
            verifySingle(streams.size(), "Dataset is not found", "Multiple datasets found with the same name");
            schema = streams.get(0).toDataSchema();
        }

        Api.ImportDataset response = Api.ImportDataset.newBuilder()
                .setDefinition(source.getDefinition())
                .setSource(source.getDefinition())
                .setDataset(request.getDataset())
                .setSchema(ApiMessageMapper.toImportSchema(schema))
                .build();
        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportDataset(response)
                .build();
    }

    @SneakyThrows
    public Api.Response getImportSyncs(Principal principal, Api.Request apiRequest) {
        Api.ImportSyncList request = apiRequest.getImportSyncListRequest();
        verifyPresent(request.getProject(), "Project is missing");

        String source = request.hasSource() ? request.getSource() : null;
        String dataset = request.hasDataset() ? request.getDataset() : null;

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Syncs syncs = provider.loadSyncs(principal, folder);

        if (source != null || dataset != null) {
            List<String> filtered = new ArrayList<>();

            for (Sync sync : syncs.getSyncs().values()) {
                if ((source != null && !source.equals(sync.getSource()))
                        || (dataset != null && !dataset.equals(sync.getDataset()))) {
                    filtered.add(sync.getSync());
                }
            }

            for (String id : filtered) {
                syncs.getSyncs().remove(id);
            }
        }

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportSyncs(ApiMessageMapper.toImportSyncs(syncs))
                .build();
    }

    @SneakyThrows
    public Api.Response getImportSync(Principal principal, Api.Request apiRequest) {
        Api.ImportSyncGet request = apiRequest.getImportSyncGetRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSync(), "Sync is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, false);

        Syncs syncs = provider.loadSyncs(principal, folder);
        Sync sync = syncs.getSyncs().get(request.getSync());
        verifyFound(sync, "Sync is not found");

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportSync(ApiMessageMapper.toImportSync(sync))
                .build();
    }

    @SneakyThrows
    public ComputeService.ComputeTask startImportSync(Principal principal, Api.Request apiRequest,
                                                      ComputeService.ComputeCallback callback) {
        Api.ImportSyncStart request = apiRequest.getImportSyncStartRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");
        verifyPresent(request.getDataset(), "Dataset is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, true);

        Pair<Source, Sync> result = beginImportSync(principal, file, folder, request);
        Source source = result.getLeft();
        Sync sync = result.getRight();

        callback.onUpdate(
                Api.Response.newBuilder()
                        .setId(apiRequest.getId())
                        .setImportSync(ApiMessageMapper.toImportSync(sync))
                        .build()
        );

        ComputeService.ComputeCallback handler = new ComputeService.ComputeCallback() {
            @Override
            public void onUpdate(Api.Response response) {
                callback.onUpdate(response);
            }

            @Override
            public void onComplete() {
                onComplete(Sync.Status.SUCCEEDED);
            }

            @Override
            public void onFailure(Throwable error) {
                log.error("Import sync {} failed", sync.getSync(), error);
                onComplete(Sync.Status.FAILED);
            }

            private void onComplete(Sync.Status status) {
                Sync result = completeImportSync(principal, file, folder, sync.getSync(), status);

                if (result == null) {
                    callback.onFailure(new IllegalStateException("Failed to complete sync"));
                } else {
                    callback.onUpdate(
                            Api.Response.newBuilder()
                                    .setId(apiRequest.getId())
                                    .setImportSync(ApiMessageMapper.toImportSync(result))
                                    .build()
                    );
                    callback.onComplete();
                }
            }
        };

        DataDefinition definition = registry.getDefinition(source.getDefinition());
        try {
            ComputeService.ComputeTask task;
            if (definition != null) {
                Api.Request importApiRequest = Api.Request.newBuilder()
                        .setId(apiRequest.getId())
                        .setImportRequest(Api.ImportRequest.newBuilder()
                                .setDefinition(source.getDefinition())
                                .setPath(sync.getPath())
                                .setDataset(request.getDataset())
                                .setSchema(ApiMessageMapper.toImportSchema(sync.getSchema()))
                                .setConfiguration(toApi(source, Api.ImportSource.newBuilder()).getConfiguration())
                                .build())
                        .build();


                task = computer.importData(importApiRequest, handler, principal);
            } else {
                AirbyteService.DataStream dataStream = AirbyteService.DataStream.fromDataSchema(
                        request.getDataset(), sync.getSchema());
                String configJson = MAPPER.writeValueAsString(source.getConfiguration());
                task = airbyteService.startSync(
                        sync.getDefinition(),
                        configJson,
                        dataStream,
                        sync.getPath(),
                        sync.getSync(),
                        principal,
                        handler);
            }

            tasks.put(sync.getSource(), task);
            return task;
        } catch (Throwable error) {
            completeImportSync(principal, file, folder, sync.getSync(), Sync.Status.FAILED);
            throw error;
        }
    }

    public Api.Response cancelImportSync(Principal principal, Api.Request apiRequest) {
        Api.ImportSyncCancel request = apiRequest.getImportSyncCancelRequest();
        verifyPresent(request.getProject(), "Project is missing");
        verifyPresent(request.getSource(), "Source is missing");
        verifyPresent(request.getSync(), "Sync is missing");

        String file = provider.getProjectFile(request.getProject());
        String folder = provider.getProjectFolder(request.getProject());
        checkPermissions(principal, file, true);

        Sources sources = provider.loadSources(principal, folder);
        Source source = sources.getSources().get(request.getSource());
        verifyFound(source, "Source is missing");

        Syncs syncs = provider.loadSyncs(principal, folder);
        Sync sync = syncs.getSyncs().get(request.getSync());
        verifyFound(sync, "Sync is not found");

        if (sync.getStatus() != Sync.Status.RUNNING) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_FAILED, "Sync is not running");
        }

        topic.publish(ApiMessageMapper.fromApiRequest(apiRequest));

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setImportSync(toApi(sync, Api.ImportSync.newBuilder()))
                .build();
    }

    @SneakyThrows
    private Pair<Source, Sync> beginImportSync(Principal principal, String file, String folder,
                                               Api.ImportSyncStart request) {
        RLock lock = getProjectLock(file);
        lock.lock();

        try {
            Sources sources = provider.loadSources(principal, folder);
            Source source = sources.getSources().get(request.getSource());
            verifyFound(source, "Source is missing");

            Syncs syncs = provider.loadSyncs(principal, folder);
            long version = 1;

            for (Sync sync : syncs.getSyncs().values()) {
                if (request.getDataset().equals(sync.getDataset()) && request.getSource().equals(sync.getSource())) {
                    version = Math.max(version, sync.getVersion() + 1);
                }
            }

            String id = generateId();
            Sync sync = new Sync();
            sync.setDefinition(source.getDefinition());
            sync.setSource(source.getSource());
            sync.setDataset(request.getDataset());
            sync.setSchema(ApiMessageMapper.fromImportSchema(request.getSchema()));
            sync.setSync(id);
            sync.setStatus(Sync.Status.RUNNING);
            sync.setVersion(version);
            sync.setStartedAt(System.currentTimeMillis());
            sync.setPath("%s.imports/%s/data.csv".formatted(folder, id));

            syncs.getSyncs().put(sync.getSync(), sync);
            provider.saveSyncs(principal, folder, syncs);

            return Pair.of(source, sync);
        } finally {
            lock.unlock();
        }
    }

    private Sync completeImportSync(Principal principal, String file, String folder,
                                    String syncId, Sync.Status status) {
        RLock lock = getProjectLock(file);
        lock.lock();

        try {
            Syncs syncs = provider.loadSyncs(principal, folder);
            Sync sync = syncs.getSyncs().get(syncId);
            if (sync == null || sync.getStatus() != Sync.Status.RUNNING) {
                return null;
            }

            sync.setStatus(status);
            sync.setStoppedAt(System.currentTimeMillis());

            provider.saveSyncs(principal, folder, syncs);
            return sync;
        } finally {
            lock.unlock();
        }
    }

    private void onMessage(CharSequence channel, String message) {
        Api.Request apiRequest = ApiMessageMapper.parseRequest(message, Api.Request::getImportSyncCancelRequest,
                Api.ImportSyncCancel.class);

        Api.ImportSyncCancel request = apiRequest.getImportSyncCancelRequest();
        ComputeService.ComputeTask task = tasks.get(request.getSync());

        if (task != null) {
            task.cancel();
        }
    }

    private static void verifyPresent(String string, String message) {
        if (StringUtils.isEmpty(string)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private static void verifyFound(Object object, String message) {
        if (object == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, message);
        }
    }

    private static void verifySingle(int count, String notFoundMessage, String multipleFoundMessage) {
        if (count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, notFoundMessage);
        }

        if (count > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, multipleFoundMessage);
        }
    }

    private static String generateId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    @SneakyThrows
    private void checkPermissions(Principal principal, String file, boolean readWrite) {
        DialFileApi.Attributes attributes;

        try {
            attributes = dial.getAttributes(file, true, false, null, principal);
        } catch (FileNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project is not found");
        }

        Set<String> required = readWrite ? Set.of("READ", "WRITE") : Set.of("READ");

        if (!attributes.permissions().containsAll(required)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Permissions: " + attributes.permissions() + ", but required: " + required);
        }
    }

    @SneakyThrows
    private RLock getProjectLock(String file) {
        return redis.getLock(namespace + ".import_lock." + file);
    }

    @SneakyThrows
    private static <T extends Message.Builder> T toApi(Object bean, T builder) {
        String json = MAPPER.writeValueAsString(bean);
        return ApiMessageMapper.fromJson(json, builder);
    }

    @SneakyThrows
    private static <T> T fromApi(MessageOrBuilder message, Class<T> type) {
        String json = ApiMessageMapper.toJson(message);
        return DialFileApi.MAPPER.readValue(json, type);
    }
}