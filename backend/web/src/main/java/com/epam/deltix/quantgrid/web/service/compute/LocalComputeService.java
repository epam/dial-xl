package com.epam.deltix.quantgrid.web.service.compute;

import com.epam.deltix.quantgrid.engine.Computation;
import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModels;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvOutputWriter;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.util.Strings;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.service.ProjectManager;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.redisson.api.RedissonClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.OutputStream;
import java.security.Principal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import javax.annotation.Nullable;
import javax.annotation.PreDestroy;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "COMPUTE", matchIfMissing = true)
public class LocalComputeService implements ComputeService {

    private final ConcurrentHashMap<String, Computation> computations = new ConcurrentHashMap<>();
    private final ApplicationContext context;
    private final ClusterSettings settings;
    @Nullable
    private final ClusterApi cluster;
    private final ProjectManager manager;
    private final TaskScheduler scheduler;


    public LocalComputeService(ApplicationContext context,
                               ClusterSettings settings,
                               @Nullable RedissonClient redis,
                               ProjectManager manager,
                               TaskScheduler scheduler) {
        this.context = context;
        this.settings = settings;
        this.manager = manager;
        this.scheduler = scheduler;
        this.cluster = redis == null ? null : new ClusterApi(redis, settings.getNamespace());
    }

    @Override
    public long timeout() {
        return settings.getNodeOperationTimeout();
    }

    @EventListener(ApplicationReadyEvent.class)
    private void joinCluster() {
        if (cluster != null) {
            log.info("Cluster. Settings: {}", settings);

            boolean added = cluster.addComputeNode(settings.getNodeId(),
                    settings.getNodeEndpoint(), settings.getNodeHeartbeatTimeout());

            if (!added) {
                throw new IllegalStateException("Cluster. Can't join");
            }

            scheduler.scheduleAtFixedRate(this::heartbeatCluster,
                    Duration.ofMillis(settings.getNodeHeartbeatInterval()));
        }

        EmbeddingModels.load();
    }

    @PreDestroy
    private void leaveCluster() {
        if (cluster != null) {
            log.info("Cluster. Leaving compute node: {}", settings.getNodeId());
            cluster.removeComputeNode(settings.getNodeId());
        }
    }

    private void heartbeatCluster() {
        if (cluster != null) {
            log.debug("Cluster. Heartbeating");
            boolean ok = cluster.heartbeatComputeNode(settings.getNodeId(), settings.getNodeHeartbeatTimeout());

            if (!ok) {
                log.warn("Cluster. Failed to heartbeat this compute node");
                CompletableFuture.runAsync(() -> {
                    int exitCode = SpringApplication.exit(context);
                    System.exit(exitCode);
                });
            }
        }
    }

    @Override
    @SneakyThrows
    public ComputeTask compute(Api.Request apiRequest, ComputeCallback callback, Principal principal) {
        Api.CalculateWorksheetsRequest request = apiRequest.getCalculateWorksheetsRequest();
        String id = apiRequest.hasId() ? apiRequest.getId() : UUID.randomUUID().toString();

        if (computations.containsKey(id)) {
            throw new IllegalArgumentException("Calculation with such id already exists: " + id);
        }

        CalculateCallback handler = new CalculateCallback(id, request.getIncludeCompilation(), callback);
        ProjectContext project = manager.create(principal, handler, request.getWorksheetsMap());

        Computation computation = project.calculate(request.getViewportsList(), request.getIncludeProfile(),
                request.getIncludeIndices(), request.getShared());
        Computation existing = computations.putIfAbsent(id, computation);

        if (existing != null) {
            computation.cancel();
            throw new IllegalArgumentException("Calculation with such id already exists: " + id);
        }

        computation.onComplete(error -> {
            computations.remove(id);

            if (error == null) {
                callback.onComplete();
            } else {
                callback.onFailure(error);
            }
        });

        return computation::cancel;
    }

    @Override
    public void cancel(Api.Request apiRequest, Principal principal) {
        Api.CancelRequest request = apiRequest.getCancelRequest();
        String id = request.getCalculationId();
        Set<ParsedKey> keys = ApiMessageMapper.toParsedKeys(request);
        Computation computation = computations.get(id);

        if (computation != null && !keys.isEmpty()) {
            computation.cancel(keys);
        }
    }

    @Override
    @SneakyThrows
    public Api.Response search(Api.Request apiRequest, Principal principal) {
        Api.SimilaritySearchRequest request = apiRequest.getSimilaritySearchRequest();
        SearchCallback handler = new SearchCallback();

        ProjectContext project = manager.create(principal, handler, request.getSheetsMap());
        Computation computation = project.similaritySearch(request);
        computation.await(timeout(), TimeUnit.SECONDS);

        if (handler.errored) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to search");
        }

        Api.SimilaritySearchResponse response = Api.SimilaritySearchResponse.newBuilder()
                .addAllScores(handler.scores).build();

        return Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setStatus(Api.Status.SUCCEED)
                .setSimilaritySearchResponse(response)
                .build();
    }

    @Override
    @SneakyThrows
    public void download(Api.Request apiRequest, Supplier<OutputStream> output, Principal principal) {
        Api.DownloadRequest request = apiRequest.getDownloadRequest();

        String table = request.getTable();
        List<String> columns = request.getColumnsList();

        ResultCallback handler = new ResultCallback(table, columns);
        List<Api.Viewport> viewports = ResultCallback.buildViewports(table, columns);

        ProjectContext project = manager.create(principal, handler, request.getSheetsMap());
        Computation computation = project.calculate(viewports, false, false, false);
        computation.await(timeout(), TimeUnit.MILLISECONDS);

        List<String> names = columns.stream().toList();
        List<StringColumn> values = new ArrayList<>();

        for (String name : names) {
            StringColumn column = handler.results.get(name);
            if (column == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to calculate column: " + name);
            }
            values.add(column);
        }

        try (OutputStream stream = output.get()) {
            CsvOutputWriter.write(names, values, stream);
        }
    }

    @Override
    @SneakyThrows
    public void export(Api.Request apiRequest, Principal principal) {
        Api.ExportRequest request = apiRequest.getExportRequest();

        String path = request.getPath();
        String table = request.getTable();
        List<String> columns = request.getColumnsList();

        ResultCallback handler = new ResultCallback(table, columns);
        List<Api.Viewport> viewports = ResultCallback.buildViewports(table, columns);

        ProjectContext project = manager.create(principal, handler, request.getSheetsMap());
        Computation computation = project.calculate(viewports, false, false, false);
        computation.await(timeout(), TimeUnit.MILLISECONDS);

        List<String> names = columns.stream().toList();
        List<StringColumn> values = new ArrayList<>();

        for (String name : names) {
            StringColumn column = handler.results.get(name);
            if (column == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to calculate column: " + name);
            }
            values.add(column);
        }

        project.getProvider().writeData(path, names, values, principal);
    }

    @RequiredArgsConstructor
    private static class CalculateCallback implements ResultListener {

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
        public void onCompilation(Compilation compilation) {
            if (includeCompilation) {
                Api.Response response = ApiMessageMapper.toCompilationResponse(id, parsedSheets, compilation);
                callback.onUpdate(response);
            }
        }

        @Override
        public void onUpdate(ParsedKey key, long start, long end, boolean content, boolean raw,
                             Table value, String error, ResultType type) {

            Api.ColumnData data = ApiMessageMapper.toColumnData(
                    key, start, end, content, raw, value, error, type);

            Api.Response response = Api.Response.newBuilder()
                    .setId(id)
                    .setStatus(Api.Status.SUCCEED)
                    .setColumnData(data)
                    .build();

            callback.onUpdate(response);
        }

        @Override
        public void onProfile(Trace trace, long startedAt, long stoppedAt, boolean completed) {
            Api.Profile profile = ApiMessageMapper.toProfile(trace, startedAt, stoppedAt, completed);

            Api.Response response = Api.Response.newBuilder()
                    .setId(id)
                    .setStatus(Api.Status.SUCCEED)
                    .setProfile(profile)
                    .build();

            callback.onUpdate(response);
        }

        @Override
        public void onIndex(FieldKey key, Table value, String error) {
            Api.Index index = ApiMessageMapper.toIndex(key, error);

            Api.Response response = Api.Response.newBuilder()
                    .setId(id)
                    .setStatus(Api.Status.SUCCEED)
                    .setIndex(index)
                    .build();

            callback.onUpdate(response);
        }
    }

    private static class SearchCallback implements ResultListener {
        private final List<Api.SimilaritySearchScore> scores = new ArrayList<>();
        private boolean errored;

        @Override
        public void onSimilaritySearch(FieldKey key, Table result, String error) {
            if (error != null) {
                errored = true;
                return;
            }

            StringColumn values = result.getStringColumn(0);
            DoubleColumn scores = result.getDoubleColumn(1);
            StringColumn descriptions = result.getStringColumn(2);

            for (int i = 0; i < result.size(); ++i) {
                String description = descriptions.get(i);
                Api.SimilaritySearchScore.Builder builder = Api.SimilaritySearchScore.newBuilder()
                        .setTable(key.tableName())
                        .setColumn(key.fieldName())
                        .setValue(Strings.toString(values.get(i)))
                        .setScore(scores.get(i));

                if (!Strings.isError(description)) {
                    builder.setDescription(description);
                }

                this.scores.add(builder.build());
            }
        }
    }

    @RequiredArgsConstructor
    private static class ResultCallback implements ResultListener {

        final String table;
        final List<String> columns;
        final Map<String, StringColumn> results = new HashMap<>();

        @Override
        public void onCompilation(Compilation compilation) {
            for (String column : columns) {
                FieldKey key = new FieldKey(table, column);
                CompiledResult result = compilation.results().get(key);

                if (result == null) {
                    throw new IllegalArgumentException("%s[%s] is missing or errored".formatted(table, column));
                }

                if (!(result instanceof CompiledSimpleColumn col) || col.type().isPeriodSeries()) {
                    throw new IllegalArgumentException("%s[%s] has non-exportable type".formatted(table, column));
                }
            }
        }

        @Override
        public void onUpdate(
                ParsedKey key,
                long start,
                long end,
                boolean content,
                boolean raw,
                Table value,
                String error,
                ResultType type) {
              if (value != null) {
                  FieldKey field = (FieldKey) key;
                  StringColumn column = (StringColumn) value.getColumn(0);
                  results.put(field.fieldName(), column);
              }
        }

        private static List<Api.Viewport> buildViewports(String table, List<String> columns) {
            List<Api.Viewport> viewports = new ArrayList<>();

            for (String column : columns) {
                Api.FieldKey columnKey = Api.FieldKey.newBuilder()
                        .setTable(table)
                        .setField(column)
                        .build();

                Api.Viewport viewport = Api.Viewport.newBuilder()
                        .setFieldKey(columnKey)
                        .setStartRow(0)
                        .setEndRow(Long.MAX_VALUE)
                        .build();

                viewports.add(viewport);
            }
            return viewports;
        }
    }
}