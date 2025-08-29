package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.python.PythonExec;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class PythonExpression extends ExpressionWithPlan<Table, Column> {

    private final String code;
    private final String name;
    private final ColumnType type;

    public PythonExpression(Plan layout, List<Expression> expressions, String code, String name, ColumnType type) {
        super(layout, expressions);
        this.code = code;
        this.name = name;
        this.type = type;
    }

    @Override
    public ColumnType getType() {
        return type;
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    protected Column evaluate(Table table) {
        List<PythonExec.SimpleColumn> simples = new ArrayList<>();

        for (int i = 0; i < inputs.size() - 1; i++) {
            Expression expression = expression(i);
            ColumnType type = expression.getType();
            Column column = expression.evaluate();
            simples.add(new PythonExec.SimpleColumn(column, type, i));
        }

        return PythonExec.execute(code, name, type, false, false, table, simples, List.of(), 128).getColumn(0);
    }
}
