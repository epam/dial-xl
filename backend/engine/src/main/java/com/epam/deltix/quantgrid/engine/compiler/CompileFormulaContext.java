package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ast.Function;

import java.util.List;

/**
 * Context for single formula compilation without changing compiler state.
 * Due to the fact that compiling formula - table agnostic and can't use any dimensions some methods were simplified
 * and overrode with a proper verifications.
 * Try to avoid using this context since it was designed as a temporal solution.
 */
public class CompileFormulaContext extends CompileContext {

    public CompileFormulaContext(Compiler compiler) {
        super(compiler, CompileKey.tableKey(Compiler.DIMENSIONAL_SCHEMA_REQUEST_TABLE_NAME));
    }

    CompileFormulaContext(Compiler compiler, CompileKey key, CompiledTable promotedTable, CompiledTable compiledTable
            , boolean nested, CompiledTable layout, Function function) {

        super(compiler, key, promotedTable, compiledTable, nested, layout, function);
    }

    @Override
    public CompiledTable layout(String table, List<FieldKey> dimensions) {
        if (dimensions.isEmpty()) {
            return new CompiledNestedColumn(new Scalar(), CompiledTable.REF_NA);
        }

        return super.layout(table, dimensions);
    }

    @Override
    public CompiledResult promote(CompiledResult result, List<FieldKey> dimensions) {
        if (promotedTable != null && result instanceof CompiledSimpleColumn column && column.scalar()) {
            CompiledTable source = (layout == null) ? promotedTable : layout;
            return source.scalar() ? result : new CompiledSimpleColumn(new Expand(source.node(), column.node()), dimensions);
        }

        Util.verify(dimensions.isEmpty());
        return result;
    }

    @Override
    public CompiledResult projectQueryResult(CompiledTable carry, CompiledResult result) {
        List<FieldKey> dimensions = carry.dimensions();
        boolean nested = carry.nested();

        Util.verify(dimensions.isEmpty());

        if (result instanceof CompiledSimpleColumn column) {
            column = CompileUtil.projectColumn(carry.queryReference(), column.node(), dimensions);

            if (!nested) {
                return column;
            }

            SelectLocal select = new SelectLocal(column.node());
            return new CompiledNestedColumn(select, 0);
        }

        CompiledTable table = (CompiledTable) result;
        Plan projection = CompileUtil.projectFlatTable(table.node(), carry.queryReference());

        return table.withNode(projection).withDimensions(dimensions);
    }

    @Override
    public CompileFormulaContext withCompiledAndPromoted(CompiledTable promotedTable, CompiledTable compiledTable,
                                                  boolean nested) {
        return new CompileFormulaContext(compiler, key, promotedTable, compiledTable, nested, null, function);
    }

    @Override
    public CompileFormulaContext with(CompiledTable table, boolean nested, CompiledTable layout) {
        return new CompileFormulaContext(compiler, key, table, null, nested, layout, function);
    }

    @Override
    public CompileFormulaContext with(CompiledTable table, boolean nested) {
        return with(table, nested, null);
    }


    @Override
    public CompileFormulaContext withFunction(Function function) {
        return new CompileFormulaContext(this.compiler(), this.key(), this.promotedTable, this.compiledTable,
                this.nested, layout, function);
    }
}
