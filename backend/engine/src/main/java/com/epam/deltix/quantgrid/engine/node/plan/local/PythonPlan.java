package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.python.PythonExec;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.ArrayList;
import java.util.List;

public class PythonPlan extends PlanN<Table, Table> {

    private final int[] nestedPositions;
    private final int[] simplePositions;
    private final String code;
    private final String name;
    private final ColumnType type;
    private final boolean nested;
    private final boolean scalar;

    /**
     * @param sources - layout and N nested arguments/columns.
     * @param nestedPositions - positions of nested arguments/columns.
     * @param simplePositions - positions of simple arguments/columns.
     * @param code - python code to execute.
     * @param name - python function name to execute.
     * @param type - return type.
     * @param nested - return nested type.
     * @param scalar - if layout is scalar.
     */
    public PythonPlan(List<Source> sources,
                      int[] nestedPositions, int[] simplePositions,
                      String code, String name, ColumnType type, boolean nested, boolean scalar) {
        super(sources);
        this.nestedPositions = nestedPositions;
        this.simplePositions = simplePositions;
        this.code = code;
        this.name = name;
        this.type = type;
        this.nested = nested;
        this.scalar = scalar;
    }

    @Override
    protected Plan layout() {
        return nested ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        Schema schema = nested
                ? Schema.of(Schema.inputs(this, 0), Schema.of(type))
                : Schema.of(type);

        return new Meta(schema);
    }

    @Override
    protected Table execute(List<Table> tables) {
        List<PythonExec.SimpleColumn> simples = new ArrayList<>();
        List<PythonExec.NestedColumn> nests = new ArrayList<>();

        for (int i = 0; i < simplePositions.length; i++) {
            Expression expression = expression(0, i);
            Column column = expression.evaluate();
            simples.add(new PythonExec.SimpleColumn(column, expression.getType(), simplePositions[i]));
        }

        for (int i = 0; i < nestedPositions.length; i++) {
            DoubleColumn keys = scalar ? null : expression(i + 1, 0).evaluate();
            Expression expression = expression(i + 1, scalar ? 0 : 1);
            Column values = expression.evaluate();
            nests.add(new PythonExec.NestedColumn(keys, values, expression.getType(), nestedPositions[i]));
        }

        Table layout = tables.get(0);
        return PythonExec.execute(code, name, type, nested, scalar, layout, simples, nests, 64);
    }
}
