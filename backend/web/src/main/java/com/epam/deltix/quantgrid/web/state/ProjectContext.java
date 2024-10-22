package com.epam.deltix.quantgrid.web.state;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.TotalKey;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;

import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Slf4j
@Getter
public class ProjectContext implements AutoCloseable {

    private final List<ParsedSheet> sheets;

    private final Engine engine;

    public ProjectContext(Map<String, String> worksheets, InputProvider inputProvider,
                          ExecutorService engineExecutorService, Cache engineCache) {
        this.sheets = worksheets.entrySet().stream()
                .map(entry -> SheetReader.parseSheet(entry.getKey(), entry.getValue()))
                .toList();

        this.engine = new Engine(engineCache, engineExecutorService,
                new ResultListener() {
                },
                new GraphCallback() {
                },
                inputProvider);
    }

    @Override
    public void close() {
        engine.cancel();
    }

    public CompletableFuture<Void> calculate(List<Api.Viewport> viewports,
                                             ResultListener listener,
                                             Principal principal) {
        Set<Viewport> viewPorts = new HashSet<>();
        for (Api.Viewport viewport : viewports) {
            Viewport view = convertViewport(viewport);
            viewPorts.add(view);
        }

        Engine tempEngine = engine.withListener(listener);
        return tempEngine.compute(sheets, viewPorts, null, principal);
    }

    public CompletableFuture<Void> similaritySearch(
            SimilarityRequest similarityRequest,
            ResultListener listener,
            Principal principal) {
        return engine.withListener(listener).compute(sheets, List.of(), similarityRequest, principal);
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
}
