package com.epam.deltix.quantgrid.web.service.compute;

import com.epam.deltix.quantgrid.util.SecurityUtils;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.deltix.quantgrid.web.utils.RedisUtils;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.sse.EventSource;
import okhttp3.sse.EventSourceListener;
import okhttp3.sse.EventSources;
import org.apache.commons.lang3.tuple.Pair;
import org.epam.deltix.proto.Api;
import org.jetbrains.annotations.NotNull;
import org.redisson.api.RBucket;
import org.redisson.api.RLock;
import org.redisson.api.RMap;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

import java.io.InterruptedIOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import javax.annotation.PostConstruct;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class RemoteComputeService implements ComputeService {

    private static final int RETRY_ATTEMPTS = 10;

    private final ClusterSettings settings;
    private final RedissonClient redis;
    private final TaskScheduler scheduler;
    private final OkHttpClient okHttpClient;
    private final RMap<String, ClusterNodeState> nodeRegistry;

    private volatile List<ClusterNodeState> nodes = List.of();

    public RemoteComputeService(
            ClusterSettings settings,
            RedissonClient redis,
            TaskScheduler scheduler,
            OkHttpClient okHttpClient) {
        this.settings = settings;
        this.redis = redis;
        this.scheduler = scheduler;
        this.okHttpClient = okHttpClient;
        this.nodeRegistry = redis.getMap(settings.getNodeMappingKey(), RedisUtils.NODE_STATE_CODEC);
    }

    @PostConstruct
    private void joinCluster() {
        log.info("Cluster. Settings: {}", settings);
        reloadCluster();

        RTopic topic = redis.getTopic(settings.getNodeTopicKey(), RedisUtils.NODE_EVENT_CODEC);
        topic.addListener(ClusterNodeEvent.class, (key, event) -> updateCluster(event));

        long interval = settings.getNodeHeartbeatInterval();
        scheduler.scheduleAtFixedRate(this::reloadCluster, Instant.now().plusMillis(interval),
                Duration.ofMillis(interval));
    }

    private synchronized void updateCluster(ClusterNodeEvent event) {
        log.info("Cluster. Update: {}", event);

        List<ClusterNodeState> nodes = this.nodes;
        List<ClusterNodeState> updates = null;

        ClusterNodeState state = event.getState();
        int index = Collections.binarySearch(nodes, state, Comparator.comparing(ClusterNodeState::getId));

        if (event.getAction() == ClusterNodeEvent.Action.JOIN) {
            updates = new ArrayList<>(nodes);

            if (index >= 0) {
                updates.set(index, state);
            } else {
                updates.add(-index - 1, state);
            }
        } else if (event.getAction() == ClusterNodeEvent.Action.LEAVE && index >= 0) {
            updates = new ArrayList<>(nodes);
            updates.remove(index);
        }

        if (updates != null) {
            log.info("Cluster. Updated. Active nodes: {}", updates.size());
            this.nodes = updates;
        }
    }

    private synchronized void reloadCluster() {
        try {
            long now = System.currentTimeMillis();
            List<ClusterNodeState> states = nodeRegistry.readAllValues()
                    .stream()
                    .filter(state -> state.getTimestamp() + settings.getNodeHeartbeatTimeout() >= now)
                    .sorted(Comparator.comparing(ClusterNodeState::getId))
                    .toList();

            boolean same = states.size() == nodes.size() &&
                    IntStream.range(0, states.size())
                            .mapToObj(i -> {
                                ClusterNodeState next = states.get(i);
                                ClusterNodeState prev = nodes.get(i);
                                return next.getId().equals(prev.getId())
                                        && next.getEndpoint().equals(prev.getEndpoint());
                            }).reduce(true, (left, right) -> left && right);

            if (!same) {
                log.info("Cluster. Reloaded. Active nodes: {}", states.size());
            }

            nodes = states;
        } catch (Throwable e) {
            log.warn("Cluster. Reload failed", e);
        }
    }

    private ClusterNodeState selectNode(Api.Request apiRequest) {
        String project = apiRequest.getCalculateWorksheetsRequest().getProjectName();
        List<ClusterNodeState> nodes = this.nodes;

        if (nodes.isEmpty()) {
            throw new HttpClientErrorException(HttpStatus.SERVICE_UNAVAILABLE, "No computation power");
        }

        if (settings.getNodeRoutingType() == ClusterSettings.RoutingType.HASHED) {
            return selectHashedNode(project, nodes);
        } else {
            return selectDedicatedNode(project, nodes);
        }
    }

    private ClusterNodeState selectHashedNode(String project, List<ClusterNodeState> nodes) {
        long hash = Integer.toUnsignedLong(project.hashCode());
        long step = (0xFFFFFFFFL + nodes.size() - 1) / nodes.size();
        int index = (int) (hash / step);
        return nodes.get(index);
    }

    private ClusterNodeState selectDedicatedNode(String projectId, List<ClusterNodeState> nodes) {
        String projectKey = settings.getNodeRoutingKey() + ":project:" + projectId;
        RBucket<String> projectBucket = redis.getBucket(projectKey, StringCodec.INSTANCE);
        Duration projectTimeout = Duration.ofMillis(settings.getNodeProjectTimeout());

        for (int i = 0; i < RETRY_ATTEMPTS; i++) {
            ClusterNodeState node = lookupNode(projectId, projectBucket, projectTimeout);

            if (node != null) {
                return node;
            }

            String projectLockKey = settings.getNodeRoutingKey() + ":lock:project:" + projectId;
            RLock projectLock = redis.getLock(projectLockKey);

            try {
                projectLock.lock();

                if (projectBucket.isExists()) {
                    continue; // retry
                }

                Map<String, String> nodeKeyToProjectId = lookupNodeMapping();
                detachProject(projectId, nodeKeyToProjectId);
                return attachProject(projectId, projectBucket, projectTimeout, nodes, nodeKeyToProjectId);
            } finally {
                projectLock.unlock();
            }
        }

        throw new HttpClientErrorException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to attach project");
    }

    private ClusterNodeState lookupNode(String projectId, RBucket<String> projectBucket, Duration projectTimeout) {
        String nodeId = projectBucket.getAndExpire(projectTimeout);

        if (nodeId != null) {
            String nodeKey = settings.getNodeRoutingKey() + ":node:" + nodeId;
            RBucket<String> nodeBucket = redis.getBucket(nodeKey, StringCodec.INSTANCE);
            String toProjectId = nodeBucket.getAndExpire(projectTimeout);

            if (projectId.equals(toProjectId)) {
                ClusterNodeState searchId = new ClusterNodeState();
                searchId.setId(nodeId);
                int nodeIndex = Collections.binarySearch(nodes, searchId,
                        Comparator.comparing(ClusterNodeState::getId));

                if (nodeIndex >= 0) {
                    return nodes.get(nodeIndex);
                }

                ClusterNodeState node = nodeRegistry.get(nodeId);
                long now = System.currentTimeMillis();

                if (node != null && node.getTimestamp() + settings.getNodeHeartbeatTimeout() >= now) {
                    return node;
                }

                return null;
            }

            projectBucket.compareAndSet(nodeId, null);
        }

        return null;
    }

    private Map<String, String> lookupNodeMapping() {
        String[] allNodeKeys = nodes.stream()
                .map(node -> settings.getNodeRoutingKey() + ":node:" + node.getId())
                .toArray(String[]::new);

        return redis.getBuckets(StringCodec.INSTANCE).get(allNodeKeys);
    }

    private void detachProject(String projectId, Map<String, String> nodeKeyToProjectIdMap) {
        for (Map.Entry<String, String> entry : nodeKeyToProjectIdMap.entrySet()) {
            String nodeKey = entry.getKey();
            String toProjectId = entry.getValue();

            if (projectId.equals(toProjectId)) {
                RBucket<String> nodeBucket = redis.getBucket(nodeKey, StringCodec.INSTANCE);
                nodeBucket.compareAndSet(projectId, null);
            }
        }
    }

    private ClusterNodeState attachProject(String projectId,
                                           RBucket<String> projectBucket,
                                           Duration projectTimeout,
                                           List<ClusterNodeState> nodes,
                                           Map<String, String> nodeKeyToProjectIdMap) {
        for (ClusterNodeState node : nodes) {
            String nodeKey = settings.getNodeRoutingKey() + ":node:" + node.getId();
            String toProjectId = nodeKeyToProjectIdMap.get(nodeKey);

            if (toProjectId != null && !projectId.equals(toProjectId)) {
                continue;
            }

            RBucket<String> nodeBucket = redis.getBucket(nodeKey, StringCodec.INSTANCE);

            if (nodeBucket.setIfAbsent(projectId, projectTimeout)) {
                projectBucket.set(node.getId(), projectTimeout);
                return node;
            }
        }

        throw new HttpClientErrorException(HttpStatus.SERVICE_UNAVAILABLE, "No computation power");
    }

    @Override
    public ComputeTask compute(Api.Request apiRequest, ComputeCallback callback, Principal principal) {
        ClusterNodeState node = selectNode(apiRequest);
        return routeRequest(node, apiRequest, callback, principal);
    }

    private ComputeTask routeRequest(ClusterNodeState node, Api.Request apiRequest,
                                     ComputeCallback callback, Principal principal) {
        String url = "http://%s/v1/calculate".formatted(node.getEndpoint());
        log.info("Cluster. Routing. Project: {}. Node: {}",
                apiRequest.getCalculateWorksheetsRequest().getProjectName(),
                node);

        byte[] body = ApiMessageMapper.fromApiRequest(apiRequest).getBytes(StandardCharsets.UTF_8);
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);
        Request.Builder requestBuilder = new Request.Builder()
                .url(url)
                .post(RequestBody.create(body))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE);
        if (authorization != null) {
            requestBuilder.header(authorization.getKey(), authorization.getValue());
        }
        CalculateEventSourceListener listener = new CalculateEventSourceListener(callback);

        EventSource.Factory factory = EventSources.createFactory(okHttpClient);
        EventSource source = factory.newEventSource(requestBuilder.build(), listener);

        return source::cancel;
    }

    private static class CalculateEventSourceListener extends EventSourceListener {
        private final ComputeCallback callback;
        private volatile boolean done;

        public CalculateEventSourceListener(ComputeCallback callback) {
            this.callback = callback;
        }

        @Override
        public void onEvent(@NotNull EventSource eventSource, String id, String type, @NotNull String data) {
            if (done) {
                throw new IllegalStateException("[DONE] message has already been received.");
            }

            if ("[DONE]".equals(data)) {
                done = true;
            } else {
                Api.Response response = ApiMessageMapper.toApiResponse(data);
                callback.onUpdate(response);
            }
        }

        @Override
        public void onClosed(@NotNull EventSource eventSource) {
            if (done) {
                callback.onComplete();
            } else {
                callback.onFailure(new InterruptedIOException("The stream was interrupted."));
            }
        }

        @Override
        public void onFailure(@NotNull EventSource eventSource, Throwable exception, Response response) {
            callback.onFailure(exception);
        }
    }
}