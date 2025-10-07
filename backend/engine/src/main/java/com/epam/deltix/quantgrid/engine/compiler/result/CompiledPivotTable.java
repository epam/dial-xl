package com.epam.deltix.quantgrid.engine.compiler.result;

import java.util.ArrayList;
import java.util.List;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;

public class CompiledPivotTable extends CompiledAbstractTable {

    private final Plan names;
    private final List<Key> keys;
    private final String pivotName;
    private final ColumnFormat pivotFormat;
    private final ColumnType pivotType;

    public CompiledPivotTable(Plan names, Plan pivot, List<Key> keys,
                              String pivotName, ColumnFormat pivotFormat, ColumnType pivotType) {
        this(names, pivot, keys, pivotName, pivotFormat, pivotType, REF_NA, List.of(), true);
    }

    private CompiledPivotTable(Plan names, Plan pivot, List<Key> keys,
                               String pivotName, ColumnFormat pivotFormat, ColumnType pivotType,
                               int currentRef, List<FieldKey> dimensions, boolean nested) {
        super(pivot, dimensions, currentRef, REF_NA, nested);
        this.names = names;
        this.keys = keys;
        this.pivotName = pivotName;
        this.pivotFormat = pivotFormat;
        this.pivotType = pivotType;
    }

    @Override
    public String name() {
        return "PivotTable";
    }

    @Override
    public boolean reference() {
        return false;
    }

    @Override
    public boolean assignable() {
        return true;
    }

    @Override
    public List<String> fields(CompileContext context) {
        List<String> fields = new ArrayList<>(keys.stream().map(Key::name).toList());

        if (pivotName != null) {
            fields.add(pivotName);
        }

        return fields;
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        List<String> fields = fields(context);
        int position = fields.indexOf(name);
        CompileUtil.verify(position >= 0, "The table does not contain a column: " + name);

        if (CompiledPivotColumn.PIVOT_NAME.equals(name)) {
            Get column = new Get(node, currentRef + position + 1);
            SelectLocal select = hasCurrentReference()
                    ? new SelectLocal(currentReference(), column)
                    : new SelectLocal(column);

            return new CompiledPivotColumn(names, select, pivotFormat, pivotType, currentRef, dimensions, nested);
        }

        ColumnFormat format = name.equals(pivotName) ? pivotFormat : keys.get(position).format;
        Get get = new Get(node, currentRef + position + 1);
        CompiledNestedColumn column = hasCurrentReference()
                ? new CompiledNestedColumn(new SelectLocal(currentReference(), get), dimensions, 0, 1, format)
                : new CompiledNestedColumn(new SelectLocal(get), dimensions, REF_NA, 0, format);

        return nested ? column : column.flat();
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompileUtil.verify(currentRef <= 0);
        CompileUtil.verify(queryRef == REF_NA);
        return new CompiledPivotTable(names, node, keys, pivotName, pivotFormat, pivotType,
                currentRef, dimensions, nested);
    }

    public record Key(String name, ColumnFormat format) {
    }
}
