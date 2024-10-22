package com.epam.deltix.quantgrid.web.service.compute;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.CompileKey;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.service.ProjectManager;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.deltix.quantgrid.web.utils.RedisUtils;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.redisson.api.RMap;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import javax.annotation.Nullable;
import javax.annotation.PreDestroy;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "COMPUTE", matchIfMissing = true)
public class LocalComputeService implements ComputeService {

    private final ClusterSettings settings;
    @Nullable
    private final RedissonClient redis;
    private final ProjectManager manager;
    private final TaskScheduler scheduler;

    private final RMap<String, ClusterNodeState> nodeRegistry;
    private final RTopic nodeTopic;


    public LocalComputeService(ClusterSettings settings,
                               @Nullable RedissonClient redis,
                               ProjectManager manager,
                               TaskScheduler scheduler) {
        this.settings = settings;
        this.redis = redis;
        this.manager = manager;
        this.scheduler = scheduler;

        if (redis == null) {
            this.nodeRegistry = null;
            this.nodeTopic = null;
        } else {
            this.nodeRegistry = redis.getMap(settings.getNodeMappingKey(), RedisUtils.NODE_STATE_CODEC);
            this.nodeTopic = redis.getTopic(settings.getNodeTopicKey(), RedisUtils.NODE_EVENT_CODEC);
        }
    }

    private ClusterNodeState createNodeState() {
        ClusterNodeState state = new ClusterNodeState();
        state.setId(settings.getNodeId());
        state.setEndpoint(settings.getNodeEndpoint());
        state.setTimestamp(System.currentTimeMillis());
        return state;
    }

    private ClusterNodeEvent createNodeEvent(ClusterNodeState state, ClusterNodeEvent.Action action) {
        ClusterNodeEvent event = new ClusterNodeEvent();
        event.setState(state);
        event.setAction(action);
        return event;
    }

    @EventListener(ApplicationReadyEvent.class)
    private void joinCluster() {
        if (redis != null) {
            log.info("Cluster. Settings: {}", settings);

            ClusterNodeState state = createNodeState();
            ClusterNodeEvent event = createNodeEvent(state, ClusterNodeEvent.Action.JOIN);

            log.info("Cluster. Joining: {}", state);

            nodeRegistry.put(state.getId(), state);
            nodeTopic.publish(event);

            scheduler.scheduleAtFixedRate(this::heartbeatCluster,
                    Duration.ofMillis(settings.getNodeHeartbeatInterval()));
            scheduler.scheduleAtFixedRate(this::evictCluster, Duration.ofMillis(settings.getNodeHeartbeatTimeout()));
        }
    }

    @PreDestroy
    private void leaveCluster() {
        if (redis != null) {
            ClusterNodeState state = createNodeState();
            ClusterNodeEvent event = createNodeEvent(state, ClusterNodeEvent.Action.LEAVE);

            log.info("Cluster. Leaving: {}", state);

            nodeRegistry.remove(state.getId());
            nodeTopic.publish(event);
        }
    }

    private void heartbeatCluster() {
        if (redis != null) {
            ClusterNodeState state = createNodeState();
            log.debug("Cluster. Heartbeating: {}", state);

            RMap<String, ClusterNodeState> mapping =
                    redis.getMap(settings.getNodeMappingKey(), RedisUtils.NODE_STATE_CODEC);
            mapping.put(state.getId(), state);
        }
    }

    private void evictCluster() {
        if (redis != null) {
            long now = System.currentTimeMillis();
            RMap<String, ClusterNodeState> mapping =
                    redis.getMap(settings.getNodeMappingKey(), RedisUtils.NODE_STATE_CODEC);

            ClusterNodeState[] expired = mapping.readAllValues().stream()
                    .filter(state -> state.getTimestamp() + settings.getNodeHeartbeatTimeout() < now)
                    .toArray(ClusterNodeState[]::new);

            if (expired.length > 0) {
                log.info("Cluster. Evicting: {}", List.of(expired));

                for (ClusterNodeState state : expired) {
                    mapping.remove(state.getId(), state);
                }
            }
        }
    }

    @Override
    @SneakyThrows
    public ComputeTask compute(Api.Request apiRequest, ComputeCallback callback, Principal principal) {
        Api.CalculateWorksheetsRequest request = apiRequest.getCalculateWorksheetsRequest();
        ProjectContext project = manager.create(request.getWorksheetsMap());
        Callback handler = new Callback(apiRequest.getId(), request.getIncludeCompilation(), callback);
        CompletableFuture<Void> future = project.calculate(request.getViewportsList(), handler, principal);

        future.whenComplete((unused, throwable) -> {
            if (throwable == null) {
                callback.onComplete();
            } else {
                callback.onFailure(throwable);
            }
        });

        return project::close;
    }

    @RequiredArgsConstructor
    private static class Callback implements ResultListener {

        final String id;
        final boolean includeCompilation;
        final ComputeCallback callback;
        List<ParsedSheet> parsedSheets;

        @Override
        public void onParsing(List<ParsedSheet> sheets) {
            parsedSheets = sheets;
            // includeParsing is not used yet
        }

        @Override
        public void onCompilation(Map<CompileKey, CompiledResult> results, Map<ParsedKey, String> errors) {
            if (includeCompilation) {
                Api.Response response = ApiMessageMapper.toCompilationResponse(id, parsedSheets, results, errors);
                callback.onUpdate(response);
            }
        }

        @Override
        public void onUpdate(ParsedKey key, long start, long end, boolean content,
                             Table value, String error, ResultType type) {

            Api.ColumnData data = ApiMessageMapper.toColumnData(
                    key, start, end, content, value, error, type);

            Api.Response response = Api.Response.newBuilder()
                    .setId(id)
                    .setStatus(Api.Status.SUCCEED)
                    .setColumnData(data)
                    .build();

            callback.onUpdate(response);
        }
    }
}