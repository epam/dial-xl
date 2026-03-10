package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CompiledGroupTable extends CompiledAbstractTable {

    private final LinkedHashMap<String, ColumnFormat> columns;
    private final int keys;

    public CompiledGroupTable(Plan plan, LinkedHashMap<String, ColumnFormat> columns, int keys) {
        this(plan, columns, keys, REF_NA, List.of(), true);
    }

    private CompiledGroupTable(Plan plan, LinkedHashMap<String, ColumnFormat> columns, int keys,
                               int currentRef, List<FieldKey> dimensions, boolean nested) {
        super(plan, dimensions, currentRef, REF_NA, nested);
        this.columns = columns;
        this.keys = keys;
    }

    @Override
    public String name() {
        return "GroupTable";
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
        return columns.keySet().stream().toList();
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        ColumnFormat format = null;
        int position = 0;

        for (Map.Entry<String, ColumnFormat> entry : columns.entrySet()) {
            if (entry.getKey().equals(name)) {
                format = entry.getValue();
                break;
            }

            position++;
        }

        CompileUtil.verify(format != null, "The table does not contain column: " + name);

        Get get = new Get(node, currentRef + position + 1);
        CompiledNestedColumn column = hasCurrentReference()
                ? new CompiledNestedColumn(new SelectLocal(currentReference(), get), dimensions, 0, 1, format)
                : new CompiledNestedColumn(new SelectLocal(get), dimensions, REF_NA, 0, format);

        return nested ? column : column.flat();
    }

    @Override
    public List<String> keys(CompileContext context) {
        return columns.keySet().stream().toList().subList(0, keys);
    }

    @Override
    public CompiledTable with(Plan plan, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompileUtil.verify(currentRef <= 0);
        CompileUtil.verify(queryRef == REF_NA);
        return new CompiledGroupTable(plan, columns, keys, currentRef, dimensions, nested);
    }
}