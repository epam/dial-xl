package com.epam.deltix.quantgrid.web.service;

import com.google.gson.reflect.TypeToken;
import io.kubernetes.client.common.KubernetesListObject;
import io.kubernetes.client.common.KubernetesObject;
import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.ApiException;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1ConfigMap;
import io.kubernetes.client.openapi.models.V1ConfigMapList;
import io.kubernetes.client.openapi.models.V1ContainerState;
import io.kubernetes.client.openapi.models.V1ContainerStateWaiting;
import io.kubernetes.client.openapi.models.V1ContainerStatus;
import io.kubernetes.client.openapi.models.V1Pod;
import io.kubernetes.client.openapi.models.V1PodList;
import io.kubernetes.client.openapi.models.V1PodStatus;
import io.kubernetes.client.openapi.models.V1Secret;
import io.kubernetes.client.openapi.models.V1SecretList;
import io.kubernetes.client.util.Watch;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Call;
import org.apache.commons.collections4.ListUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

@Slf4j
@Service
@RequiredArgsConstructor
public class KubernetesService {
    private static final Type POD_TYPE = new TypeToken<Watch.Response<V1Pod>>() {
    }.getType();
    private static final int PAGE_LIMIT = 20;

    private final ApiClient apiClient;

    public void createPod(V1Pod pod, String namespace) throws ApiException {
        pod = pod.spec(pod.getSpec().overhead(null));
        String name = getName(pod);
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Creating pod: {}", name);
        api.createNamespacedPod(namespace, pod).execute();
        log.info("Created pod: {}", name);
    }

    public V1ConfigMap createConfigMap(V1ConfigMap configMap, String namespace) throws ApiException {
        String name = getName(configMap);
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Creating config map: {}", name);
        V1ConfigMap created = api.createNamespacedConfigMap(namespace, configMap).execute();
        log.info("Created config map: {}", name);
        return created;
    }

    public V1Secret createSecret(V1Secret secret, String namespace) throws ApiException {
        String name = getName(secret);
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Creating secret: {}", name);
        V1Secret created = api.createNamespacedSecret(namespace, secret).execute();
        log.info("Created secret: {}", name);
        return created;
    }

    public void waitForPodCompletion(String name, String namespace, int timeoutSeconds)
            throws ApiException, IOException {
        CoreV1Api api = new CoreV1Api(apiClient);
        Call call = api.listNamespacedPod(namespace)
                .watch(true)
                .fieldSelector("metadata.name=" + name)
                .timeoutSeconds(timeoutSeconds)
                .buildCall(null);

        Set<String> imagePullRetries = new HashSet<>();
        try (Watch<V1Pod> watch = Watch.createWatch(api.getApiClient(), call, POD_TYPE)) {
            for (Watch.Response<V1Pod> item : watch) {
                V1Pod pod = item.object;
                if (pod == null || pod.getStatus() == null) {
                    continue;
                }

                V1PodStatus podStatus = pod.getStatus();
                String phase = podStatus.getPhase();
                log.trace("Pod {} is in phase: {}", name, phase);

                if ("Pending".equals(phase)) {
                    for (V1ContainerStatus status : ListUtils.emptyIfNull(podStatus.getInitContainerStatuses())) {
                        verifyStatus(status, imagePullRetries);
                    }

                    for (V1ContainerStatus status : ListUtils.emptyIfNull(podStatus.getContainerStatuses())) {
                        verifyStatus(status, imagePullRetries);
                    }

                    continue;
                }

                if ("Running".equals(phase)) {
                    continue;
                }

                if ("Succeeded".equals(phase)) {
                    log.info("Pod completed successfully.");
                    return;
                }

                throw new PodFailedException("Pod failed", pod.getStatus());
            }
        }
    }

    private static void verifyStatus(V1ContainerStatus status, Set<String> imagePullRetries) {
        if (status == null) {
            return;
        }

        V1ContainerState state = status.getState();
        if (state == null) {
            return;
        }

        V1ContainerStateWaiting waiting = state.getWaiting();
        if (waiting == null) {
            return;
        }

        if ("ErrImagePull".equals(waiting.getReason())
            && imagePullRetries.contains(status.getName())) {
            // Fail pod after an unsuccessful retry of image pull.
            // Otherwise, it will be retried indefinitely.
            throw new IllegalStateException("Pod image pull failed for container '"
                    + status.getName() + "': " + waiting.getMessage());
        }

        if ("ImagePullBackOff".equals(waiting.getReason())) {
            // Allow for one retry to avoid false positives on transient errors.
            imagePullRetries.add(status.getName());
        }
    }

    public Iterable<V1Pod> lookupPods(String namespace, String purpose) {
        return lookupResources(token -> fetchPodPage(namespace, purpose, token));
    }

    public Iterable<V1ConfigMap> lookupConfigMaps(String namespace, String purpose) {
        return lookupResources(token -> fetchConfigMapPage(namespace, purpose, token));
    }

    public Iterable<V1Secret> lookupSecrets(String namespace, String purpose) {
        return lookupResources(token -> fetchSecretPage(namespace, purpose, token));
    }

    @SneakyThrows
    private V1PodList fetchPodPage(String namespace, String purpose, String token) {
        CoreV1Api api = new CoreV1Api(apiClient);
        return api.listNamespacedPod(namespace)
                .labelSelector("purpose=" + purpose)
                ._continue(token)
                .limit(PAGE_LIMIT)
                .execute();
    }

    @SneakyThrows
    private V1ConfigMapList fetchConfigMapPage(String namespace, String purpose, String token) {
        CoreV1Api api = new CoreV1Api(apiClient);
        return api.listNamespacedConfigMap(namespace)
                .labelSelector("purpose=" + purpose)
                ._continue(token)
                .limit(PAGE_LIMIT)
                .execute();
    }

    @SneakyThrows
    private V1SecretList fetchSecretPage(String namespace, String purpose, String token) {
        CoreV1Api api = new CoreV1Api(apiClient);
        return api.listNamespacedSecret(namespace)
                .labelSelector("purpose=" + purpose)
                ._continue(token)
                .limit(PAGE_LIMIT)
                .execute();
    }

    private static <T extends KubernetesObject> Iterable<T> lookupResources(
            Function<String, KubernetesListObject> fetcher) {
        return () -> new Iterator<T>() {
            private List<T> resources = List.of();
            private int index;
            private String token;
            private boolean last;

            @Override
            public boolean hasNext() {
                if (index < resources.size()) {
                    return true;
                }

                if (!last) {
                    fetchPage();
                    return index < resources.size();
                }

                return false;
            }

            @Override
            public T next() {
                if (!hasNext()) {
                    throw new NoSuchElementException();
                }

                return resources.get(index++);
            }

            @SuppressWarnings("unchecked")
            private void fetchPage() {
                KubernetesListObject list = fetcher.apply(token);
                if (list.getMetadata() != null) {
                    token = list.getMetadata().getContinue();
                } else {
                    token = null;
                }
                index = 0;
                last = StringUtils.isBlank(token);
                resources = (List<T>) list.getItems();
            }
        };
    }

    public String getPodLogs(String name, String namespace) throws ApiException {
        return getPodLogs(name, null, namespace, null);
    }

    public String getPodLogs(String name, String container, String namespace, Integer tailLines) throws ApiException {
        CoreV1Api api = new CoreV1Api(apiClient);
        return api.readNamespacedPodLog(name, namespace)
                .tailLines(tailLines)
                .container(container)
                .execute();
    }

    public void deletePod(String name, String namespace) throws ApiException {
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Deleting pod: {}", name);
        api.deleteNamespacedPod(name, namespace)
                .gracePeriodSeconds(0)
                .execute();
        log.info("Deleted pod: {}", name);
    }

    public void deleteConfigMap(String name, String namespace) throws ApiException {
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Deleting config map: {}", name);
        api.deleteNamespacedConfigMap(name, namespace).execute();
        log.info("Deleted config map: {}", name);
    }

    public void deleteSecret(String name, String namespace) throws ApiException {
        CoreV1Api api = new CoreV1Api(apiClient);
        log.info("Deleting secret: {}", name);
        api.deleteNamespacedSecret(name, namespace).execute();
        log.info("Deleted secret: {}", name);
    }

    public static String getName(KubernetesObject obj) {
        return Objects.requireNonNull(obj.getMetadata(), "Object metadata is null").getName();
    }

    private static String getNamespace(KubernetesObject obj) {
        return Objects.requireNonNull(obj.getMetadata(), "Object metadata is null").getNamespace();
    }
}
