package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

/**
 * Context for single formula compilation without changing compiler state.
 * Due to the fact that compiling formula - table agnostic and can't use any dimensions some methods were simplified
 * and overrode with a proper verifications.
 * Try to avoid using this context since it was designed as a temporal solution.
 */
public class CompileFormulaContext extends CompileContext {

    public CompileFormulaContext(Compiler compiler) {
        super(compiler, new CompileKey("#invalid"));
    }

    CompileFormulaContext(Compiler compiler, CompileKey key, CompiledTable table, boolean nested) {
        super(compiler, key, table, nested, null);
    }

    @Override
    public CompiledTable layout(String table, List<FieldKey> dimensions) {
        if (dimensions.isEmpty()) {
            return new CompiledReferenceTable(table, new Scalar());
        }

        return super.layout(table, dimensions);
    }

    @Override
    public List<FieldKey> combine(List<FieldKey> left, List<FieldKey> right) {
        Util.verify(left.isEmpty() && right.isEmpty());
        return left;
    }

    @Override
    public CompiledResult promote(CompiledResult result, List<FieldKey> dimensions) {
        if (table != null && result instanceof CompiledColumn column && column.scalar()) {
            CompiledTable source = (layout == null) ? table : layout;
            return source.scalar() ? result : new CompiledColumn(new Expand(source.node(), column.node()), dimensions);
        }

        Util.verify(dimensions.isEmpty());
        return result;
    }

    @Override
    public CompiledResult projectQueryField(CompiledTable carry, String tableName, String fieldName, boolean nested) {
        Util.verify(carry.dimensions().isEmpty());

        List<FieldKey> dimensions = carry.dimensions();
        CompiledResult result = field(tableName, fieldName, true);

        if (result instanceof CompiledColumn column) {
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
    public CompileContext with(CompiledTable table, boolean nested) {
        return new CompileFormulaContext(this.compiler(), this.key(), table, nested);
    }
}
