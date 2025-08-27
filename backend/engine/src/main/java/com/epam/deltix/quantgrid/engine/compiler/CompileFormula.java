package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledValueTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.ast.ConstBool;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.FieldsReference;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileFormula {

    public static CompiledResult compile(CompileContext context, Formula formula) {
        if (formula instanceof TableReference reference) {
            return compileTableReference(context, reference);
        }

        if (formula instanceof FieldReference reference) {
            return compileFieldReference(context, reference);
        }

        if (formula instanceof FieldsReference reference) {
            return compileFieldsReference(context, reference);
        }

        if (formula instanceof CurrentField reference) {
            return compileCurrentField(context, reference);
        }

        if (formula instanceof QueryRow) {
            return compileQueryRowReference(context);
        }

        if (formula instanceof ConstBool constant) {
            return new CompiledSimpleColumn(new Constant(constant.value()), List.of(), BooleanFormat.INSTANCE);
        }

        if (formula instanceof ConstNumber constant) {
            return new CompiledSimpleColumn(new Constant(constant.number()), List.of(), GeneralFormat.INSTANCE);
        }

        if (formula instanceof ConstText constant) {
            return new CompiledSimpleColumn(new Constant(constant.text()), List.of(), GeneralFormat.INSTANCE);
        }

        if (formula instanceof Function function) {
            if (Functions.getFunction(function.name()) == null
                    && context.pythonFunction(function.name()) == null
                    && context.hasParsedTable(function.name())) {

                TableReference table = new TableReference(function.span(), function.name());
                function = new Function(function.span(), "RowReference", Util.listOf(table, function.arguments()));
            }

            return CompileFunction.compile(context.withFunction(function));
        }

        throw new CompileError("Unsupported formula: " + formula);
    }

    private static CompiledTable compileTableReference(CompileContext context, TableReference reference) {
        String name = reference.table();
        CompiledTable table = context.table(name);
        SelectLocal select = new SelectLocal(new RowNumber(table.node()));
        return new CompiledReferenceTable(name, select);
    }

    private static CompiledResult compileFieldReference(CompileContext context, FieldReference reference) {
        CompiledResult result = context.compileFormula(reference.table());

        if (result instanceof CompiledColumn column) {
            CompileUtil.verify(column.type() == ColumnType.PERIOD_SERIES, "Unable to access columns in text or number");
            CompileUtil.verify(!column.nested(), "Unable to access columns in nested period series");
            result = CompileExplode.explode(column);
        }

        CompiledTable table = result.cast(CompiledTable.class);
        return table.field(context, reference.field());
    }

    private static CompiledResult compileFieldsReference(CompileContext context, FieldsReference reference) {
        CompiledResult result = context.compileFormula(reference.table());

        if (result instanceof CompiledColumn column) {
            CompileUtil.verify(column.type() == ColumnType.PERIOD_SERIES, "Unable to access columns in text or number");
            CompileUtil.verify(!column.nested(), "Unable to access columns in nested period series");
            result = CompileExplode.explode(column);
        }

        CompiledTable table = result.cast(CompiledTable.class);
        List<String> fields = table.fields(context);
        boolean hasPivot = fields.contains(CompiledPivotColumn.PIVOT_NAME);

        if (!hasPivot) {
            for (String field : reference.fields()) {
                CompileUtil.verify(fields.contains(field), "Missing field: " + field);
            }
        }

        return new CompiledValueTable(table, reference.fields());
    }

    private static CompiledResult compileCurrentField(CompileContext context, CurrentField reference) {
        String fieldName = reference.field();
        return context.currentField(fieldName);
    }

    private static CompiledResult compileQueryRowReference(CompileContext context) {
        CompileUtil.verify(context.placeholder != null, "Can't reference $ outside function");
        return context.compileFormula(context.placeholder);
    }
}
