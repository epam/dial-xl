package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPeriodPointTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Explode;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

public class CompileExplode {

    private final List<FieldKey> dimensions;    // a = Range(3), b = Range(4), c = Range(b), d = Range(5)
    private final List<CompiledTable> compiled; // a,  b, abc,    d
    private final List<CompiledTable> promoted; // a, ab, abc, abcd
    private final CompiledTable scalar;
    @Getter
    private final boolean isManual;

    public CompileExplode(List<FieldKey> dimensions, CompiledTable scalar, boolean isManual) {
        this.dimensions = dimensions;
        this.compiled = new ArrayList<>();
        this.promoted = new ArrayList<>();
        this.scalar = scalar;
        this.isManual = isManual;
    }

    public List<FieldKey> dimensions() {
        return dimensions;
    }

    public CompiledTable layout() {
        return layout(dimensions);
    }

    public CompiledTable layout(List<FieldKey> target) {
        if (target.isEmpty()) {
            return scalar;
        }

        FieldKey last = target.get(target.size() - 1);
        int position = dimensions.indexOf(last);
        boolean exploded = (target.size() > 1);
        return exploded ? promoted.get(position) : compiled.get(position);
    }

    public CompiledResult add(CompiledResult result, FieldKey dimension) {
        int position = dimensions.indexOf(dimension);
        CompileUtil.verify(position == promoted.size(),
                "Dimension dependency order does not match with definition order");

        List<FieldKey> source = dimensions.subList(0, position);
        List<FieldKey> target = dimensions.subList(0, position + 1);

        CompiledTable table;
        CompiledTable mapped;

        if (result instanceof CompiledColumn column) {
            table = explode(result, column);
        } else {
            table = result.cast(CompiledTable.class);
            CompileUtil.verify(table.nested(), "Dimension is not nested table");
        }

        boolean independent = result.dimensions().isEmpty();
        mapped = promote(table, source, true).cast(CompiledTable.class).withDimensions(target);
        table = independent ? table.withDimensions(List.of(dimension)) : mapped;

        compiled.add(table);
        promoted.add(mapped);

        return compiled.get(position).flat();
    }

    public CompiledResult promote(CompiledResult result, List<FieldKey> target) {
        return promote(result, target, false);
    }

    private CompiledResult promote(CompiledResult result, List<FieldKey> target, boolean isDimension) {
        List<FieldKey> source = result.dimensions();
        if (source.equals(target)) {
            return result;
        }

        FieldKey toKey = target.get(target.size() - 1);
        int toIndex = dimensions.indexOf(toKey);
        boolean toIndependent = (target.size() == 1);
        CompiledTable to = toIndependent ? compiled.get(toIndex) : promoted.get(toIndex);

        if (source.isEmpty()) {
            if (result instanceof CompiledColumn column) {
                Expand expand = new Expand(to.node(), column.node());
                return new CompiledColumn(expand, target);
            }

            CompiledTable right = result.cast(CompiledTable.class);

            if (!right.nested()) {
                CompileUtil.verify(right.scalar());
                Plan node = right.node();
                int size = node.getMeta().getSchema().size();
                List<Expression> expressions = new ArrayList<>();

                for (int i = 0; i < size; i++) {
                    Expand expand = new Expand(to.node(), new Get(node, i));
                    expressions.add(expand);
                }

                SelectLocal select = new SelectLocal(expressions);
                return right.withNode(select).withDimensions(target);
            }

            SelectLocal leftNode = new SelectLocal(new RowNumber(to.node()));

            if (!isDimension) {
                CartesianLocal cartesian = new CartesianLocal(leftNode, right.node());
                return right.withCurrent(cartesian, target);
            }

            SelectLocal rightNode = new SelectLocal(new RowNumber(right.node()));
            CartesianLocal cartesian = new CartesianLocal(leftNode, rightNode);
            // note this type is not valid, we just want to save references positions and node
            return new CompiledReferenceTable("_invalid", cartesian, target, 0, 1, true);
        }

        CompileUtil.verify(!toIndependent);
        FieldKey fromKey = source.get(source.size() - 1);
        int fromIndex = dimensions.indexOf(fromKey);
        boolean fromIndependent = (source.size() == 1);
        Expression reference = chainReference(fromIndex, toIndex, fromIndependent);

        if (result instanceof CompiledColumn column) {
            return CompileUtil.projectColumn(reference, column.node(), target);
        }

        CompiledTable table = result.cast(CompiledTable.class);
        Plan projection = table.nested()
                ? CompileUtil.projectNestedTable(table.node(), reference, table.currentReference())
                : CompileUtil.projectFlatTable(table.node(), reference);

        return table.withNode(projection).withDimensions(target);
    }

    public List<FieldKey> combine(List<FieldKey> lefts, List<FieldKey> rights) {
        CompileUtil.verify(dimensions.containsAll(lefts));
        CompileUtil.verify(dimensions.containsAll(rights));

        if (lefts.equals(rights)) {
            return lefts;
        }

        if (lefts.isEmpty()) {
            return rights;
        }

        if (rights.isEmpty()) {
            return lefts;
        }

        int position = dimensions.size() - 1;

        for (; position >= 0; position--) {
            FieldKey dimension = dimensions.get(position);

            if (lefts.contains(dimension) || rights.contains(dimension)) {
                break;
            }
        }

        return dimensions.subList(0, position + 1);
    }

    private Expression chainReference(int fromIndex, int toIndex, boolean independent) {
        Expression reference = null;

        if (fromIndex > 0 && independent) {
            reference = promoted.get(fromIndex).queryReference();
        }

        for (int i = fromIndex; i < toIndex; i++) {
            CompiledTable next = promoted.get(i + 1);
            Get nextReference = next.currentReference();

            if (reference == null) {
                reference = nextReference;
                continue;
            }

            reference = CompileUtil.projectColumn(nextReference, reference);
        }

        return reference;
    }

    // query ref is not really needed, but other code fails, needs to be refactored
    private static CompiledTable explode(CompiledResult result, CompiledColumn column) {
        CompileUtil.verify(column.type().isPeriodSeries(), "Dimension is not period series");
        Expression series = column.node();
        RowNumber numbers = new RowNumber(series.getLayout());

        if (column.scalar()) {
            SelectLocal select = new SelectLocal(numbers, series);
            Plan explode = new Explode(select, new Get(select, 1));
            return new CompiledPeriodPointTable(explode, result.dimensions(), CompiledTable.REF_NA, 0, true);
        }

        SelectLocal select = new SelectLocal(numbers, numbers, series);
        Plan explode = new Explode(select, new Get(select, 2));
        return new CompiledPeriodPointTable(explode, result.dimensions(), 0, 1, true);
    }
}
