package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.compiler.CompileEvaluationUtils;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.web.service.ProjectManager;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.google.gson.Gson;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@RestController
@RequiredArgsConstructor
@Slf4j
public class EmbeddingController {
    private static final int TIMEOUT_STATUS_CODE = 408;

    @Data
    public static class Field {
        String table;
        String field;
        int n;

        @Override
        public String toString() {
            return table + "[" + field + "]";
        }
    }

    @Data
    public static class EmbeddingsSearchRequest {
        Map<String, String> worksheets;
        List<Field> fields;
        String query;

        int n;
        boolean search_in_all;
        boolean use_evaluation;
    }

    @Data
    public static class ScoreRecord {
        String table;
        String field;
        String data;
        double score;
        String description;

        public ScoreRecord(String table, String field, String data, double score, String description) {
            this.table = table;
            this.field = field;
            this.data = data;
            this.score = score;
            this.description = description;
        }
    }

    @Data
    public static class EmbeddingsSearchResponse {
        List<ScoreRecord> searchResults = new ArrayList<>();
    }

    private final ProjectManager projectManager;

    @PostMapping(path="/v1/embeddings/search", produces="application/json")
    public ResponseEntity<String> search(@RequestBody EmbeddingsSearchRequest request, Principal principal) throws Exception {
        if (request.getFields() != null && request.use_evaluation) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fields and use_evaluation can't be specified at the same time"
            );
        }

        if (request.search_in_all && request.use_evaluation) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "search_in_all and use_evaluation can't be specified at the same time"
            );
        }

        if (request.getFields() != null && request.search_in_all) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fields and search_in_all can't be specified at the same time"
            );
        }

        if (request.getFields() != null) {
            Set<String> requestedFields = new HashSet<>();
            for (int i = 0; i < request.getFields().size(); ++i) {
                if (!requestedFields.add(request.getFields().get(i).toString())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Fields can't contain duplicate fields"
                    );
                }
            }
        }

        EmbeddingsSearchResponse response = new EmbeddingsSearchResponse();
        ResultListener listener = new ResultListener() {
            @Override
            public synchronized void onSimilaritySearch(FieldKey key, Table searchResult, @Nullable String error) {
                if (error != null) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR);
                }

                for (int i = 0; i < searchResult.size(); ++i) {
                    response.getSearchResults().add(
                            new ScoreRecord(
                                    key.tableName(),
                                    key.fieldName(),
                                    searchResult.getStringColumn(0).get(i),
                                    searchResult.getDoubleColumn(1).get(i),
                                    searchResult.getStringColumn(2).get(i)
                            )
                    );
                }
            }
        };

        try (ProjectContext context = projectManager.create(principal, listener, request.getWorksheets())) {
            Set<SimilarityRequestField> similarityRequestFields = getSimilarityRequestFields(
                    request, context, principal);

            CompletableFuture<Void> future = context.similaritySearch(
                    new SimilarityRequest(
                            request.getQuery(),
                            similarityRequestFields,
                            "bge-small-en-v1.5",
                            request.use_evaluation
                    )
            );

            try {
                future.get(60, TimeUnit.SECONDS);
                return ResponseEntity.ok(new Gson().toJson(response));
            } catch (TimeoutException e) {
                return ResponseEntity.status(TIMEOUT_STATUS_CODE).build();
            }
        }
    }

    private static @NotNull Set<SimilarityRequestField> getSimilarityRequestFields(
            EmbeddingsSearchRequest request, ProjectContext project, Principal principal) {
        Set<SimilarityRequestField> similarityRequestFields = new HashSet<>();

        List<SimilarityRequestField> allowedFields = project.getKeyStringFieldsWithDescriptions(principal);

        if (request.search_in_all) {
            for (SimilarityRequestField field : allowedFields) {
                similarityRequestFields.add(new SimilarityRequestField(field.key(), field.descriptionKey(), request.n));
            }
        } else if (request.use_evaluation) {
            for (ParsedSheet sheet : project.getSheets()) {
                for (ParsedTable table : sheet.tables()) {
                    if (CompileEvaluationUtils.isEvaluationTable(table)) {
                        List<CompileEvaluationUtils.EvaluationField> fields = CompileEvaluationUtils.getEvaluationFields(table);

                        for (CompileEvaluationUtils.EvaluationField field : fields) {
                            similarityRequestFields.add(new SimilarityRequestField(field.field(), null, -1));
                        }
                    }
                }
            }
        } else {
            Map<FieldKey, SimilarityRequestField> allowedFieldsMap = new HashMap<>();
            for (SimilarityRequestField field : allowedFields) {
                allowedFieldsMap.put(field.key(), field);
            }

            for (Field field : request.getFields()) {
                FieldKey key = new FieldKey(field.getTable(), field.getField());

                SimilarityRequestField similarityField = allowedFieldsMap.getOrDefault(key, null);
                if (similarityField == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "The provided field is not a text key field"
                    );
                }

                similarityRequestFields.add(new SimilarityRequestField(similarityField.key(), similarityField.descriptionKey(), field.getN()));
            }
        }

        return similarityRequestFields;
    }
}
