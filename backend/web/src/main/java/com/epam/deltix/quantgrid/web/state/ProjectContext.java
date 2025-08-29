package com.epam.deltix.quantgrid.web.state;

import com.epam.deltix.quantgrid.engine.Computation;
import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.CompileEvaluationUtils;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Getter
public class ProjectContext {

    private final Engine engine;
    private final ResultListener listener;
    private final Principal principal;
    private final List<ParsedSheet> sheets;

    public ProjectContext(Engine engine, ResultListener listener, Principal principal, Map<String, String> sheets) {
        this.engine = engine;
        this.listener = listener;
        this.principal = principal;
        this.sheets = sheets.entrySet().stream()
                .map(entry -> SheetReader.parseSheet(entry.getKey(), entry.getValue()))
                .toList();
    }

    public InputProvider getProvider() {
        return engine.getInputProvider();
    }

    public Computation calculate(List<Api.Viewport> viewports, boolean profile, boolean index, boolean shared) {
        List<Viewport> viewPorts = ApiMessageMapper.toViewports(viewports);
        return engine.compute(listener, sheets, viewPorts, null, principal, profile, index, shared);
    }

    public Computation similaritySearch(Api.SimilaritySearchRequest request) {
        Set<SimilarityRequestField> similarityRequestFields = request.getColumnsList().stream()
                .map(column -> new SimilarityRequestField(
                        new FieldKey(column.getTable(), column.getColumn()), column.getN()))
                .collect(Collectors.toUnmodifiableSet());

        SimilarityRequest search = new SimilarityRequest(
                request.getQuery(),
                similarityRequestFields,
                CompileEvaluationUtils.SIMILARITY_SEARCH_MODEL,
                request.getN(),
                request.getUseEvaluation(),
                request.getSearchInAll());

        return engine.compute(listener, sheets, List.of(), search, principal, false, false, false);
    }
}
