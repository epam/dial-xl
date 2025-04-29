package com.epam.deltix.quantgrid.web.state;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.compiler.CompileEvaluationUtils;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.TotalKey;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;

import java.security.Principal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Getter
public class ProjectContext implements AutoCloseable {

    private final Principal principal;
    private final List<ParsedSheet> sheets;

    private final Engine engine;
    private final AtomicBoolean closed = new AtomicBoolean();

    public ProjectContext(Principal principal, ResultListener listener,
                          Map<String, String> worksheets, InputProvider inputProvider,
                          ExecutorService engineExecutorService, Cache engineCache) {
        this.principal = principal;
        this.sheets = worksheets.entrySet().stream()
                .map(entry -> SheetReader.parseSheet(entry.getKey(), entry.getValue()))
                .toList();

        this.engine = new Engine(engineCache, engineExecutorService,
                listener,
                new GraphCallback() {
                },
                inputProvider);
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            engine.cancel();
        }
    }

    public CompletableFuture<Void> calculate(List<Api.Viewport> viewports) {
        if (closed.get()) {
            return CompletableFuture.failedFuture(new IllegalStateException("Already closed"));
        }

        Set<Viewport> viewPorts = new HashSet<>();
        for (Api.Viewport viewport : viewports) {
            Viewport view = convertViewport(viewport);
            viewPorts.add(view);
        }

        return engine.compute(sheets, viewPorts, null, principal);
    }

    public CompletableFuture<Void> similaritySearch(Api.SimilaritySearchRequest request) {
        if (closed.get()) {
            return CompletableFuture.failedFuture(new IllegalStateException("Already closed"));
        }

        SimilarityRequest search = new SimilarityRequest(request.getQuery(), getSimilarityRequestFields(request),
                "bge-small-en-v1.5", request.getUseEvaluation());

        return engine.compute(sheets, List.of(), search, principal);
    }

    @Deprecated
    public CompletableFuture<Void> similaritySearch(SimilarityRequest similarityRequest) {
        if (closed.get()) {
            return CompletableFuture.failedFuture(new IllegalStateException("Already closed"));
        }

        return engine.compute(sheets, List.of(), similarityRequest, principal);
    }

    public List<SimilarityRequestField> getKeyStringFieldsWithDescriptions(Principal principal) {
        return engine.getKeyStringFieldsWithDescriptions(sheets, principal);
    }

    private static Viewport convertViewport(Api.Viewport viewport) {
        ParsedKey key = viewport.hasFieldKey()
                ? new FieldKey(viewport.getFieldKey().getTable(), viewport.getFieldKey().getField())
                : new TotalKey(viewport.getTotalKey().getTable(), viewport.getTotalKey().getField(),
                viewport.getTotalKey().getNumber());

        return new Viewport(key, viewport.getStartRow(), viewport.getEndRow(), viewport.getIsContent());
    }

    private Set<SimilarityRequestField> getSimilarityRequestFields(Api.SimilaritySearchRequest request) {
        Set<SimilarityRequestField> searchFields = new HashSet<>();
        List<SimilarityRequestField> allowedFields = engine.getKeyStringFieldsWithDescriptions(sheets, principal);

        if (request.getSearchInAll()) {
            for (SimilarityRequestField field : allowedFields) {
                SimilarityRequestField searchField = new SimilarityRequestField(
                        field.key(), field.descriptionKey(), request.getN());
                searchFields.add(searchField);
            }
        } else if (request.getUseEvaluation()) {
            for (ParsedSheet sheet : sheets) {
                for (ParsedTable table : sheet.tables()) {
                    if (CompileEvaluationUtils.isEvaluationTable(table)) {
                        List<CompileEvaluationUtils.EvaluationField> fields =
                                CompileEvaluationUtils.getEvaluationFields(table);

                        for (CompileEvaluationUtils.EvaluationField field : fields) {
                            SimilarityRequestField searchField = new SimilarityRequestField(field.field(), null, -1);
                            searchFields.add(searchField);
                        }
                    }
                }
            }
        } else {
            Map<FieldKey, SimilarityRequestField> allowedFieldsMap = new HashMap<>();
            for (SimilarityRequestField field : allowedFields) {
                allowedFieldsMap.put(field.key(), field);
            }

            for (Api.SimilaritySearchColumn field : request.getColumnsList()) {
                FieldKey key = new FieldKey(field.getTable(), field.getColumn());
                SimilarityRequestField allowedField = allowedFieldsMap.getOrDefault(key, null);

                if (allowedField == null) {
                    throw new IllegalArgumentException(("column: %s is not a text column "
                            + "or does not have description").formatted(key));
                }

                SimilarityRequestField searchField = new SimilarityRequestField(allowedField.key(),
                        allowedField.descriptionKey(), field.getN());
                searchFields.add(searchField);
            }
        }

        return searchFields;
    }
}
