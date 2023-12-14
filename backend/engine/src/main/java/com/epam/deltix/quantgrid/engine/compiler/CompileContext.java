package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import lombok.Getter;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Getter
@Accessors(fluent = true)
public class CompileContext {

    protected final Compiler compiler;
    protected final CompileKey key;

    /**
     * Context table is set when compiling nested formulas.
     */
    protected final CompiledTable table;

    /**
     * Defines how to reference fields from context table. Only used when context table is set.
     */
    protected final boolean nested;

    /**
     * Layout when compiling nested formula.
     */
    @Nullable
    protected final CompiledTable layout;

    public CompileContext(Compiler compiler, CompileKey key) {
        this(compiler, key, null, false, null);
    }

    public CompileContext(Compiler compiler, CompileKey key, CompiledTable table, boolean nested,
                          @Nullable CompiledTable layout) {
        this.compiler = compiler;
        this.key = key;
        this.table = table;
        this.nested = nested;
        this.layout = layout;
    }

    public CompiledTable layout() {
        return compiler.compile(new CompileKey(key.table())).cast(CompiledTable.class);
    }

    public CompiledTable layout(List<FieldKey> dimensions) {
        return layout(key.table(), dimensions);
    }

    public CompiledTable layout(String table, List<FieldKey> dimensions) {
        return compiler.layoutTable(table, dimensions);
    }

    public CompiledTable aggregationLayout(CompiledTable source) {
        if (layout == null || table == null || !CompileUtil.isContextNode(layout, table, source)) {
            return layout(source.dimensions());
        }
        return layout;
    }

    public CompiledTable scalarLayout() {
        return compiler.scalar();
    }

    /**
     * <pre>
     * table B
     *   dim [a] = RANGE(5)
     *       [b] = [a] + 10              # null
     *       [c] = A.FILTER($[a] > 0)    # A when compiling condition
     *       [d] = A.FILTER($[a] > [a])  # B, A when compiling condition
     * </pre>
     *
     * @return context table when compiling a formula inside a formula.
     */
    @Nullable
    public CompiledTable table() {
        return table;
    }

    public CompiledTable table(String name) {
        CompileKey key = new CompileKey(name);
        return compiler.compile(key).cast(CompiledTable.class);
    }

    public CompiledTable currentTable(List<FieldKey> dimensions) {
        CompiledTable layout = layout(dimensions);
        SelectLocal plan = new SelectLocal(new RowNumber(layout.node()));
        return new CompiledReferenceTable(key.table(), plan, dimensions, 0, CompiledTable.REF_NA, true);
    }

    public CompiledResult currentField(String field) {
        return currentField(field, false);
    }

    public CompiledResult currentField(String field, boolean exploded) {
        return field(key.table(), field, exploded);
    }

    public CompiledResult field(String table, String field, boolean exploded) {
        CompileKey key = new CompileKey(table, field, exploded);
        return compiler.compile(key);
    }

    public CompileContext with(CompiledTable table, boolean nested) {
        return with(table, nested, null);
    }

    public CompileContext with(CompiledTable table, boolean nested, CompiledTable layout) {
        return new CompileContext(compiler, key, table, nested, layout);
    }

    public CompiledResult compile(Formula formula) {
        return compiler.compileFormula(this, formula);
    }

    /**
     * @return collected dimensions from all reachable formulas.
     */
    public List<FieldKey> collect(Formula formula) {
        if (formula instanceof FieldReference reference && reference.table() instanceof QueryRow) {
            return List.of();
        }

        if (formula instanceof CurrentField reference) {
            return currentField(reference.field()).dimensions();
        }

        List<FieldKey> dimensions = List.of();

        for (Formula argument : formula.arguments()) {
            dimensions = combine(dimensions, collect(argument));
        }

        return dimensions;
    }

    /**
     * @return combined dimensions.
     */
    public List<FieldKey> combine(CompiledResult left, CompiledResult right) {
        return combine(left.dimensions(), right.dimensions());
    }

    /**
     * @return combined dimensions.
     */
    public List<FieldKey> combine(List<FieldKey> left, List<FieldKey> right) {
        return compiler.combineDimensions(this, left, right);
    }

    /**
     * @return promoted result to the specified dimensions.
     */
    public CompiledResult promote(CompiledResult result, List<FieldKey> dimensions) {
        if (table != null && result instanceof CompiledColumn column && column.scalar()) {
            CompiledTable source = (layout == null) ? table : layout;
            return source.scalar() ? result : new CompiledColumn(new Expand(source.node(), column.node()), dimensions);
        }

        return compiler.promoteResult(this, result, dimensions);
    }

    public CompiledResult projectCurrentField(String fieldName) {
        CompileUtil.verify(table != null, "No context table");
        CompiledTable carry = table;
        List<FieldKey> dimensions = carry.dimensions();
        CompiledResult result = currentField(fieldName);
        result = promote(result, dimensions);

        if (result instanceof CompiledColumn column) {
            if (!carry.hasCurrentReference()) {
                return column;
            }

            Get reference = carry.currentReference();
            column = CompileUtil.projectColumn(reference, column.node(), dimensions);

            if (!nested) {
                return column;
            }

            SelectLocal select = new SelectLocal(reference, column.node());
            return new CompiledNestedColumn(select, dimensions, 0, 1);
        }

        CompiledTable table = (CompiledTable) result;
        CompileUtil.verify(!table.nested(), "Dereferencing nested table is not allowed");
        CompileUtil.verify(!nested, "Dereferencing nested table is not yet supported");
        CompileUtil.verify(!dimensions.isEmpty(), "Dereferencing scalar table is not yet supported");

        Plan projection = CompileUtil.projectFlatTable(table.node(), carry.currentReference());
        return table.withNode(projection).withDimensions(dimensions);
    }

    public CompiledResult projectQueryField(CompiledTable carry, String tableName, String fieldName, boolean nested) {
        List<FieldKey> dimensions = carry.dimensions();
        CompiledResult result = field(tableName, fieldName, true);

        if (result instanceof CompiledColumn column) {
            column = CompileUtil.projectColumn(carry.queryReference(), column.node(), dimensions);

            if (!nested) {
                return column;
            }

            if (!carry.hasCurrentReference()) {
                SelectLocal select = new SelectLocal(column.node());
                return new CompiledNestedColumn(select, 0);
            }

            SelectLocal select = new SelectLocal(carry.currentReference(), column.node());
            return new CompiledNestedColumn(select, dimensions, 0, 1);
        }

        CompiledTable table = (CompiledTable) result;

        if (!table.nested()) {
            Plan projection = CompileUtil.projectFlatTable(table.node(), carry.queryReference());

            if (nested && !dimensions.isEmpty()) {
                Get reference = carry.currentReference();
                SelectLocal select = CompileUtil.selectColumns(reference, projection);
                return table.withCurrent(select, dimensions).withNested(true);
            }

            return table.withNode(projection).withDimensions(dimensions).withNested(nested);
        }

        CompileUtil.verify(!nested, "Dereferencing nested table from nested table is not allowed");
        CompileUtil.verify(this.table == null, "Dereferencing nested table within formula is not allowed");

        Plan projection = CompileUtil.projectNestedTable(table.node(),
                carry.queryReference(), table.currentReference());

        return table.withNode(projection).withDimensions(dimensions);
    }

    public ParsedTable parsedTable(String tableName) {
        return compiler.parsedObject(new CompileKey(tableName));
    }


    public MetadataProvider metadataProvider() {
        return compiler.metadataProvider();
    }
}
