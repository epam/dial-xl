package com.epam.deltix.quantgrid.web.service.compute;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.CompileKey;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvOutputWriter;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
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
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.security.Principal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import javax.annotation.Nullable;
import javax.annotation.PreDestroy;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "COMPUTE", matchIfMissing = true)
public class LocalComputeService implements ComputeService {

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
    }

    @PreDestroy
    private void leaveCluster() {
        if (cluster != null) {
            cluster.removeComputeNode(settings.getNodeId());
        }
    }

    private void heartbeatCluster() {
        if (cluster != null) {
            log.debug("Cluster. Heartbeating");
            boolean ok = cluster.heartbeatComputeNode(settings.getNodeId(), settings.getNodeHeartbeatTimeout());

            if (!ok) {
                log.warn("Cluster. Failed to heartbeat this compute node");
                SpringApplication.exit(context);
            }
        }
    }

    @Override
    @SneakyThrows
    public ComputeTask compute(Api.Request apiRequest, ComputeCallback callback, Principal principal) {
        Api.CalculateWorksheetsRequest request = apiRequest.getCalculateWorksheetsRequest();
        CalculateCallback handler = new CalculateCallback(apiRequest.getId(), request.getIncludeCompilation(), callback);
        ProjectContext project = manager.create(principal, handler, request.getWorksheetsMap());
        CompletableFuture<Void> future = project.calculate(request.getViewportsList());

        future.whenComplete((unused, throwable) -> {
            if (throwable == null) {
                callback.onComplete();
            } else {
                callback.onFailure(throwable);
            }
        });

        return project::close;
    }

    @Override
    @SneakyThrows
    public Api.Response search(Api.Request apiRequest, Principal principal) {
        Api.SimilaritySearchRequest request = apiRequest.getSimilaritySearchRequest();
        SearchCallback handler = new SearchCallback();

        try (ProjectContext project = manager.create(principal, handler, request.getSheetsMap())) {
            CompletableFuture<Void> future = project.similaritySearch(request);
            future.get(timeout(), TimeUnit.SECONDS);

            if (handler.errored) {
                throw new ComputeException("Failed to search");
            }

            Api.SimilaritySearchResponse response = Api.SimilaritySearchResponse.newBuilder()
                    .addAllScores(handler.scores).build();

            return Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setStatus(Api.Status.SUCCEED)
                    .setSimilaritySearchResponse(response)
                    .build();
        }
    }

    @Override
    @SneakyThrows
    public void download(Api.Request apiRequest, Supplier<OutputStream> output, Principal principal) {
        Api.DownloadRequest request = apiRequest.getDownloadRequest();

        DownloadCallback handler = new DownloadCallback(request);
        List<Api.Viewport> viewports = new ArrayList<>();

        for (int i = 0; i < request.getColumnsCount(); i++) {
            Api.FieldKey columnKey = Api.FieldKey.newBuilder()
                    .setTable(request.getTable())
                    .setField(request.getColumns(i))
                    .build();

            Api.Viewport viewport = Api.Viewport.newBuilder()
                    .setFieldKey(columnKey)
                    .setStartRow(0)
                    .setEndRow(Long.MAX_VALUE)
                    .build();

            viewports.add(viewport);
        }

        try (ProjectContext project = manager.create(principal, handler, request.getSheetsMap())) {
            CompletableFuture<Void> future = project.calculate(viewports);
            future.get(timeout(), TimeUnit.MILLISECONDS);

            List<String> names = request.getColumnsList().stream().toList();
            List<StringColumn> columns = new ArrayList<>();

            for (String name : names) {
                StringColumn column = handler.results.get(name);
                if (column == null) {
                    throw new ComputeException("Failed to calculate column: " + name);
                }
                columns.add(column);
            }

            try (OutputStream stream = output.get()) {
                CsvOutputWriter.write(names, columns, stream);
            }
        }
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
                Api.SimilaritySearchScore score = Api.SimilaritySearchScore.newBuilder()
                        .setTable(key.tableName())
                        .setColumn(key.fieldName())
                        .setValue(values.get(i) == null ? "N/A" : values.get(i))
                        .setDescription(descriptions.get(i) == null ? "N/A" : descriptions.get(i))
                        .setScore(scores.get(i))
                        .build();

                this.scores.add(score);
            }
        }
    }


    @RequiredArgsConstructor
    private static class DownloadCallback implements ResultListener {

        final Api.DownloadRequest request;
        final Map<String, StringColumn> results = new HashMap<>();

        @Override
        public void onCompilation(Map<CompileKey, CompiledResult> results, Map<ParsedKey, String> errors) {
            for (int i = 0; i < request.getColumnsCount(); i++) {
                String table = request.getTable();
                String column = request.getColumns(i);
                CompileKey key = CompileKey.fieldKey(table, column, true, true);
                CompiledResult result = results.get(key);

                if (result == null) {
                    throw new IllegalArgumentException("%s[%s] is missing or errored".formatted(table, column));
                }

                if (!(result instanceof CompiledSimpleColumn col) || col.type().isPeriodSeries()) {
                    throw new IllegalArgumentException("%s[%s] has non-exportable type".formatted(table, column));
                }
            }
        }

        @Override
        public void onUpdate(ParsedKey key, long start, long end, boolean content,
                             Table value, String error, ResultType type) {
            if (value != null) {
                FieldKey field = (FieldKey) key;
                StringColumn column = (StringColumn) value.getColumn(0);
                results.put(field.fieldName(), column);
            }
        }
    }
}