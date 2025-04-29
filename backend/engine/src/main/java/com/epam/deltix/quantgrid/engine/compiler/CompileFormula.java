package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
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
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileFormula {

    public static CompiledResult compile(CompileContext context, Formula formula) {
        if (formula instanceof CompiledFormula compiled) {
            return compiled.result();
        }

        if (formula instanceof TableReference reference) {
            return compileTableReference(context, reference);
        }

        if (formula instanceof FieldReference reference) {
            return compileFieldReference(context, reference);
        }

        if (formula instanceof CurrentField reference) {
            return compileCurrentField(context, reference);
        }

        if (formula instanceof QueryRow) {
            return compileQueryRowReference(context);
        }

        if (formula instanceof ConstBool constant) {
            return new CompiledSimpleColumn(new Constant(constant.value()), List.of());
        }

        if (formula instanceof ConstNumber constant) {
            return new CompiledSimpleColumn(new Constant(constant.number()), List.of());
        }

        if (formula instanceof ConstText constant) {
            return new CompiledSimpleColumn(new Constant(constant.text()), List.of());
        }

        if (formula instanceof Function function) {
            if (Functions.getFunction(function.name()) == null
                    && context.pythonFunction(function.name()) == null
                    && context.hasParsedTable(function.name())) {

                TableReference table = new TableReference(function.name());
                function = new Function("RowReference", Util.listOf(table, function.arguments()));
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
        CompiledTable table = context.compileFormula(reference.table()).cast(CompiledTable.class);
        return table.field(context, reference.field());
    }

    private static CompiledResult compileCurrentField(CompileContext context, CurrentField reference) {
        String fieldName = reference.field();
        return context.currentField(fieldName);
    }

    private static CompiledResult compileQueryRowReference(CompileContext context) {
        CompileUtil.verify(context.placeholder != null, "Can't reference $ outside function");
        CompiledResult result = context.compileFormula(context.placeholder);
        CompileUtil.verify(!(result instanceof CompiledPivotTable), "Pivot table can't be dimension or used in formulas");
        return result;
    }
}
