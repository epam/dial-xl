package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.rule.ProjectionVerifier;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalMetadataProvider;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.SheetReader;
import lombok.experimental.UtilityClass;
import org.junit.jupiter.api.Assertions;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@UtilityClass
public class TestExecutor {

    @SuppressWarnings("unckecked")
    public static <R extends Table> R execute(Node node) {
        if (node instanceof Expression expression) {
            Column column = expression.evaluate();
            return (R) new LocalTable(column);
        } else {
            return (R) ((Plan) node).execute();
        }
    }

    public static Exception executeError(Node node) {
        try {
            execute(node);
            return null;
        } catch (Exception ex) {
            return ex;
        }
    }

    public static ResultCollector executeWithoutErrors(String dsl) {
        ResultCollector collector = executeWithoutProjections(dsl);
        assertThat(collector.getErrors()).as("No errors are expected").isEmpty();
        return collector;
    }

    public static ResultCollector executeWithErrors(String dsl) {
        Engine engine = singleThreadEngine();

        validateSheet(dsl);
        CompletableFuture<Void> computationFuture = engine.compute(dsl, 1);
        Map<FieldKey, String> compilationErrors = engine.getCompilationErrors();
        compilationErrors.forEach((field, error) -> engine.getListener().onUpdate(field.tableName(),
                field.fieldName(), -1, -1, true, 1, null, error, null));
        try {
            computationFuture.get(2, TimeUnit.SECONDS);
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            throw new RuntimeException(e);
        }

        return (ResultCollector) engine.getListener();
    }

    public static ResultCollector executeWithoutProjections(String dsl) {
        Engine engine = singleThreadEngine();

        validateSheet(dsl);
        CompletableFuture<Void> computationFuture = engine.compute(dsl, 1);
        Assertions.assertTrue(engine.getCompilationErrors().isEmpty(), "No compilation errors expected");

        try {
            computationFuture.get(2, TimeUnit.SECONDS);
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            throw new RuntimeException(e);
        }

        return (ResultCollector) engine.getListener();
    }

    public static Engine multiThreadEngine() {
        return multiThreadEngine(new PostOptimizationCallback(new ProjectionVerifier()));
    }

    public static Engine multiThreadEngine(GraphCallback graphCallback) {
        return engine(ExecutorUtil.fixedThreadExecutor(), graphCallback);
    }

    public static Engine singleThreadEngine() {
        return singleThreadEngine(new PostOptimizationCallback(new ProjectionVerifier()));
    }

    public static Engine singleThreadEngine(GraphCallback graphCallback) {
        return engine(ExecutorUtil.directExecutor(), graphCallback);
    }

    private static Engine engine(ExecutorService service, GraphCallback graphCallback) {
        LocalMetadataProvider metadataProvider = new LocalMetadataProvider(TestInputs.INPUTS_PATH);
        ResultCollector collector = new ResultCollector();
        return new Engine(service, collector, graphCallback, metadataProvider);
    }

    private static void validateSheet(String dsl) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);
        List<ParsingError> parsingErrors = parsedSheet.getErrors();
        if (!parsingErrors.isEmpty()) {
            String errors = parsingErrors.stream().map(Objects::toString)
                    .collect(Collectors.joining("\n", "Parsing failed:\n ", ""));
            Assertions.fail(errors);
        }
    }

}
