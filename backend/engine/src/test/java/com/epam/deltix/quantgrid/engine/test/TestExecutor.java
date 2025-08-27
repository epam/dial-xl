package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.Computation;
import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.cache.LocalCache;
import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.rule.ProjectionVerifier;
import com.epam.deltix.quantgrid.engine.service.input.storage.local.LocalInputProvider;
import com.epam.deltix.quantgrid.engine.store.local.LocalStore;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.SheetReader;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.apache.commons.io.FileUtils;
import org.junit.jupiter.api.Assertions;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@UtilityClass
public class TestExecutor {

    static {
        System.setProperty("qg.python.timeout", "1000");
        System.setProperty("qg.embedding.models.path", "../../embedding_models");
        System.setProperty("qg.embedding.execution.mode", "ACCURACY");
    }

    @SuppressWarnings("unckecked")
    public static <R extends Table> R execute(Node node) {
        if (node instanceof Expression expression) {
            Column column = expression.evaluate();
            return (R) new LocalTable(column);
        } else {
            return (R) ((Plan) node).execute();
        }
    }

    public static ResultCollector executeWithoutErrors(String dsl) {
        return executeWithoutErrors(dsl, false);
    }

    public static ResultCollector executeWithoutErrors(String dsl, boolean withProjections) {
        ResultCollector collector = execute(dsl, withProjections);
        assertThat(collector.getErrors()).as("No errors are expected").isEmpty();
        collector.verifyTraces();
        return collector;
    }

    public static ResultCollector executeWithErrors(String dsl) {
        return executeWithErrors(dsl, false);
    }

    public static ResultCollector executeWithErrors(String dsl, boolean withParsingErrors) {
        return executeWithErrors(dsl, withParsingErrors, false);
    }

    public static ResultCollector executeWithErrors(String dsl, boolean withParsingErrors, boolean withProjections) {
        Engine engine = singleThreadEngine(withProjections);

        if (!withParsingErrors) {
            validateSheet(dsl);
        }

        ResultCollector collector = new ResultCollector();
        Computation computation = engine.compute(collector, dsl, null);

        computation.await(15, TimeUnit.SECONDS);
        return collector;
    }

    public static ResultCollector execute(String dsl, boolean withProjections) {
        Engine engine = singleThreadEngine(withProjections);

        validateSheet(dsl);
        ResultCollector collector = new ResultCollector();
        Computation computation = engine.compute(collector, dsl, null);

        Assertions.assertTrue(collector.getErrors().isEmpty(),
                "No compilation errors expected: " + collector.getErrors().entrySet().stream()
                        .map(e -> e.getKey() + ": " + e.getValue()).collect(Collectors.joining(",")));

        computation.await(15, TimeUnit.SECONDS);
        return collector;
    }

    public static Engine multiThreadEngine() {
        return multiThreadEngine(new PostOptimizationCallback(new ProjectionVerifier()));
    }

    public static Engine multiThreadEngine(GraphCallback graphCallback) {
        return engine(ExecutorUtil.fixedThreadExecutor(), graphCallback, plan -> false);
    }

    public static Engine singleThreadEngine() {
        return singleThreadEngine(new PostOptimizationCallback(new ProjectionVerifier()));
    }

    public static Engine singleThreadEngine(boolean withProjections) {
        if (withProjections) {
            return singleThreadEngine(new PostOptimizationCallback());
        } else {
            return singleThreadEngine(new PostOptimizationCallback(new ProjectionVerifier()));
        }
    }

    public static Engine singleThreadEngine(GraphCallback graphCallback) {
        return singleThreadEngine(graphCallback, plan -> false);
    }

    public static Engine singleThreadEngine(GraphCallback graphCallback, Predicate<Plan> toStore) {
        return engine(ExecutorUtil.singleThreadExecutor(), graphCallback, toStore);
    }

    @SneakyThrows
    private static Engine engine(ExecutorService service, GraphCallback graphCallback, Predicate<Plan> toStore) {
        LocalInputProvider inputProvider = new LocalInputProvider(TestInputs.INPUTS_PATH);
        LocalStore resultStore = new LocalStore(TestInputs.RESULTS_PATH);
        FileUtils.deleteQuietly(TestInputs.RESULTS_PATH.toFile());
        resultStore.init();
        return new Engine(new LocalCache(), service, service, graphCallback, inputProvider, resultStore, toStore);
    }

    private static void validateSheet(String dsl) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);
        List<ParsingError> parsingErrors = parsedSheet.errors();
        if (!parsingErrors.isEmpty()) {
            String errors = parsingErrors.stream().map(Objects::toString)
                    .collect(Collectors.joining("\n", "Parsing failed:\n ", ""));
            Assertions.fail(errors);
        }
    }

}
