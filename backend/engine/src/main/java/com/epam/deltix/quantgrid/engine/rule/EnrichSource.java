package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.ExpressionWithPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan.Source;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import it.unimi.dsi.fastutil.objects.Object2ObjectOpenHashMap;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

/**
 * The rule enforces the following:
 * <ul>
 *   <li>Only {@link Plan}'s source columns are used to evaluate associated expressions.</li>
 *   <li>{@link Expand} has source as the layout</li>
 *   <li>{@link RowNumber} is used by {@link Get}ting it from the source, rather than directly.</li>
 * </ul>
 *
 * <p>For instance, {@link FilterLocal} condition should be evaluated by using only source data.
 * Another example is {@link DistinctByLocal} source should have all the columns that are used as the dedup key.
 */
@Slf4j
public class EnrichSource implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(EnrichSource::enrichNode);
    }

    private static Node enrichNode(Node node) {
        if (!(node instanceof Plan plan)) {
            return node;
        }

        if (plan.getPlanCount() == 0 || plan.getExpressionCount() == 0) {
            return plan;
        }

        List<Source> sources = plan.sources();

        boolean noReconnection = true;
        List<Reconnect> reconnections = new ArrayList<>();
        for (Source source : sources) {
            Reconnect reconnect = new Reconnect(source);
            if (reconnect.source.plan() instanceof SelectLocal) {
                collectReconnection(source, reconnect);
            }
            noReconnection &= reconnect.nothingToReconnect();
            reconnections.add(reconnect);
        }

        if (noReconnection) {
            // return when none of the sources needs reconnection
            return plan;
        }
        return enrichPlan(plan, reconnections);
    }

    private static Plan enrichPlan(Plan plan, List<Reconnect> reconnections) {
        List<Source> inputSources = new ArrayList<>();

        for (Reconnect reconnect : reconnections) {
            Source reconnectedSource = reconnectSource(reconnect);
            inputSources.add(reconnectedSource);
        }

        Plan newPlan = plan.copyPlan(inputSources);

        int newSize = newPlan.getMeta().getSchema().size();
        int originalSize = plan.getMeta().getSchema().size();
        if (newSize > originalSize) {
            return select(newPlan, originalSize);
        }

        return newPlan;
    }

    /**
     * Creates a new source (Select) adding missing columns.
     * Source's expressions are reconnected to the newly created source.
     */
    private static Source reconnectSource(Reconnect reconnect) {
        Source source = reconnect.source();

        if (reconnect.nothingToReconnect()) {
            return source;
        }

        SelectLocal select = (SelectLocal) source.plan();

        List<Expression> newExpressions = new ArrayList<>(select.getExpressions());
        for (Get get : reconnect.gets()) {
            if (!newExpressions.contains(get)) {
                newExpressions.add(get);
            }
        }
        SelectLocal newSelect = new SelectLocal(newExpressions);

        Map<Node, Node> clonedNodes = new Object2ObjectOpenHashMap<>();
        for (int i = 0; i < newExpressions.size(); ++i) {
            // also replaces RowNumber with Get, if RowNumber is used directly in some expression
            clonedNodes.put(newExpressions.get(i), new Get(newSelect, i));
        }

        List<Expression> toClone = source.expressions();
        List<Expression> expressionClones = new ArrayList<>(toClone.size());
        for (Expression expression : toClone) {
            Expression clone = ConditionUtil.cloneExpressionAndConnectToSource(
                    expression, select, newSelect, clonedNodes);
            expressionClones.add(clone);
        }
        return new Source(newSelect, expressionClones);
    }

    private static void collectReconnection(Source source, Reconnect reconnect) {
        Set<Node> visited = new HashSet<>(); // reuse across expressions to make traversal linear and avoid duplicates
        for (Expression expression : source.expressions()) {
            collectNonSource(expression, visited, reconnect);
        }
    }

    private static void collectNonSource(
            Expression expression,
            Set<Node> visited,
            Reconnect reconnect) {

        Plan source = reconnect.source().plan();

        Queue<Expression> queue = new ArrayDeque<>();
        if (visited.add(expression)) {
            queue.add(expression);
        }

        while (!queue.isEmpty()) {
            Expression expr = queue.remove();

            if (expr instanceof Get get && get.plan() != source) {
                reconnect.gets().add(get);
            } else if (expr instanceof Expand expand && expand.plan() != source) {
                reconnect.expands().add(expand);
            } else if (expr instanceof RowNumber rowNumber) {
                reconnect.rowNumbers().add(rowNumber);
            } else if (expr instanceof ExpressionWithPlan<?, ?>) {
                // skip any other ExpressionWithPlan
            } else {
                int size = expr.getInputs().size();
                for (int i = 0; i < size; i++) {
                    Expression in = expr.expression(i);
                    if (visited.add(in)) {
                        queue.add(in);
                    }
                }
            }
        }
    }

    private static SelectLocal select(Plan newPlan, int originalSize) {
        List<Expression> originalGets = new ArrayList<>(originalSize);
        for (int i = 0; i < originalSize; i++) {
            originalGets.add(new Get(newPlan, i));
        }
        return new SelectLocal(originalGets);
    }

    private record Reconnect(
            Source source,
            List<Get> gets,
            List<Expand> expands, // collect only to trigger reconnect
            List<RowNumber> rowNumbers // collect only to trigger reconnect
    ) {
        public Reconnect(Source source) {
            this(source, new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        }

        boolean nothingToReconnect() {
            return gets.isEmpty() && expands.isEmpty() && rowNumbers.isEmpty();
        }
    }
}
