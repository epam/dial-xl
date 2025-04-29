package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Value;
import it.unimi.dsi.fastutil.Pair;
import lombok.Getter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;


@NotSemantic
public abstract class Plan extends Node {

    @Getter
    protected final int planCount;
    private final int[] groupStart;
    private final int[] groupCount;

    private Meta meta;

    protected Plan(List<List<Expression>> expressions) {
        super(expressions.stream().flatMap(Collection::stream).map(Node.class::cast).toList());
        planCount = 0;
        Pair<int[], int[]> groups = buildGroups(planCount, expressions);
        groupStart = groups.left();
        groupCount = groups.right();
    }

    protected Plan(Source... sources) {
        super(buildInput(Arrays.asList(sources)));
        planCount = sources.length;
        Pair<int[], int[]> groups = buildGroups(sources);
        groupStart = groups.left();
        groupCount = groups.right();
    }

    public final Meta getMeta() {
        if (meta == null) {
            meta = meta();
            Util.verify(meta != null, "Node %s returns nullable meta", getClass());
        }

        return meta;
    }

    @Override
    public boolean isInvalidated() {
        return super.isInvalidated() && meta == null;
    }

    @Override
    public void invalidate() {
        super.invalidate();
        meta = null;
    }

    public final Plan plan(int index) {
        return (Plan) inputs.get(index);
    }

    public final int getExpressionCount() {
        return inputs.size() - planCount;
    }

    public final int expressionCount(int sourceIndex) {
        return groupCount[sourceIndex];
    }

    protected final Expression expression(int sourceIndex) {
        int start = groupStart[sourceIndex];
        int size = groupCount[sourceIndex];
        Util.verify(size == 1);
        return (Expression) inputs.get(start);
    }

    public final Expression expression(int sourceIndex, int elementIndex) {
        int start = groupStart[sourceIndex];
        int size = groupCount[sourceIndex];
        Util.verify(size > 0 && elementIndex < size);
        return (Expression) inputs.get(start + elementIndex);
    }

    public final List<Expression> expressions(int sourceIndex) {
        return expressions(sourceIndex, 0);
    }

    @SuppressWarnings("unchecked")
    public final List<Expression> expressions(int sourceIndex, int fromIndex) {
        int start = groupStart[sourceIndex];
        int size = groupCount[sourceIndex];
        return (List<Expression>) (Object) inputs.subList(start + fromIndex, start + size);
    }

    public final Source source(int index) {
        Plan source = plan(index);
        List<Expression> expressions = expressions(index);
        return new Source(source, expressions);
    }

    public final List<Source> sources() {
        List<Source> sources = new ArrayList<>(planCount);
        for (int i = 0; i < planCount; i++) {
            sources.add(source(i));
        }
        return sources;
    }

    protected abstract Meta meta();

    public abstract Value execute();

    public void update(int[] mapping) {
        for (Identity identity : identities) {
            int[] columns = identity.columns();

            for (int i = 0; i < columns.length; i++) {
                int column = columns[i];
                columns[i] = mapping[column];
            }
        }
    }

    public Plan copyPlan(List<Source> sources) {
        Util.verify(sources.size() == planCount, "Cannot change number of input plans");
        for (int i = 0; i < sources.size(); i++) {
            Source source = sources.get(i);
            Util.verify(source.expressions().size() == groupCount[i], "Expression count cannot change");
        }

        return (Plan) super.copy(buildInput(sources));
    }

    @Override
    public Plan copy(boolean withIdentity) {
        return (Plan) super.copy(withIdentity);
    }

    @Override
    public Plan copy() {
        return (Plan) super.copy();
    }

    @Override
    public Plan copy(Node... inputs) {
        return (Plan) super.copy(inputs);
    }

    @Override
    public Plan copy(List<Node> inputs) {
        return (Plan) super.copy(inputs);
    }

    @Override
    public Plan copy(List<Node> inputs, boolean withIdentity) {
        return (Plan) super.copy(inputs, withIdentity);
    }

    protected static Source sourceOf(Plan plan) {
        return new Source(plan, List.of());
    }

    public static Source sourceOf(Plan plan, Expression... expressions) {
        return new Source(plan, List.of(expressions));
    }

    public static Source sourceOf(Plan plan, List<Expression> expressions) {
        return new Source(plan, expressions);
    }

    private static List<Node> buildInput(List<Source> sources) {
        List<Node> input = new ArrayList<>();

        for (Source source : sources) {
            input.add(source.plan());
        }

        for (Source source : sources) {
            input.addAll(source.expressions());
        }

        return input;
    }

    private static Pair<int[], int[]> buildGroups(Source[] sources) {
        List<List<Expression>> expressionGroups = Arrays.stream(sources).map(Source::expressions).toList();
        return buildGroups(sources.length, expressionGroups);
    }

    private static Pair<int[], int[]> buildGroups(int planCount, List<List<Expression>> expressions) {
        int[] starts = new int[expressions.size()];
        int[] counts = new int[expressions.size()];
        int start = planCount;

        for (int index = 0; index < expressions.size(); index++) {
            List<Expression> group = expressions.get(index);
            starts[index] = start;
            counts[index] = group.size();
            start += group.size();
        }

        return Pair.of(starts, counts);
    }

    public record Source(Plan plan, List<Expression> expressions) {
    }
}
