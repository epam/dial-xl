package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.compiler.CompileEvaluationUtils;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class GroundTruthLocal extends Plan1<Table, Table> {
    private final ParsedTable parsedTable;

    public GroundTruthLocal(ParsedTable parsedTable, Plan plan, Expression... expressions) {
        super(plan, List.of(expressions));

        this.parsedTable = parsedTable;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING));
    }

    @Override
    public Table execute(Table table) {
        StringColumn tableNameColumn = source(0).expressions().get(0).evaluate();
        StringColumn fieldNameColumn = source(0).expressions().get(1).evaluate();

        String tableName = tableNameColumn.get(0);
        String fieldName = fieldNameColumn.get(0);

        List<CompileEvaluationUtils.EvaluationField> fields = CompileEvaluationUtils.getEvaluationFields(parsedTable);

        for (int i = 0; i < fields.size(); ++i) {
            CompileEvaluationUtils.EvaluationField field = fields.get(i);

            if (field.field().tableName().equals(tableName) && field.field().fieldName().equals(fieldName)) {
                StringColumn column = table.getStringColumn(i);

                return new LocalTable(new StringLambdaColumn(column::get, column.size()));
            }
        }

        return new LocalTable(new StringDirectColumn());
    }

    @Override
    public String toString() {
        return "GroundTruth()";
    }
}
