package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public class CompiledInputTable extends CompiledAbstractTable {

    private final InputLocal input;
    private final List<String> columnNames;
    private final List<ColumnFormat> columnFormats;

    public CompiledInputTable(InputLocal input, List<String> columnNames, List<ColumnFormat> columnFormats, Plan node) {
        this(input, columnNames, columnFormats, node, List.of(), REF_NA, 0, true);
        CompileUtil.verify(node.getMeta().getSchema().size() == 1);
    }

    private CompiledInputTable(InputLocal input, List<String> columnNames, List<ColumnFormat> columnFormats,
                               Plan node, List<FieldKey> dimensions,
                               int currentRef, int queryRef, boolean nested) {
        super(node, dimensions, currentRef, queryRef, nested);
        this.input = input;
        this.columnNames = columnNames;
        this.columnFormats = columnFormats;
    }

    @Override
    public boolean reference() {
        return false;
    }

    @Override
    public boolean assignable() {
        return false;
    }

    @Override
    public String name() {
        return "Input(" + input.getMetadata().name() + ")";
    }

    @Override
    public List<String> fields(CompileContext context) {
        return columnNames;
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        int index = columnNames.indexOf(name);
        CompileUtil.verify(index != -1, "Unknown field [%s] in INPUT", name);

        Get inputRef = queryReference();
        Get inputColumn = new Get(input, index);
        ColumnFormat format = columnFormats.get(index);
        CompiledSimpleColumn column = CompileUtil.projectColumn(inputRef, inputColumn, dimensions, format);

        if (!nested) {
            return column;
        }

        if (!hasCurrentReference()) {
            SelectLocal select = new SelectLocal(column.node());
            return new CompiledNestedColumn(select, 0, column.format());
        }

        SelectLocal select = new SelectLocal(currentReference(), column.node());
        return new CompiledNestedColumn(select, dimensions, 0, 1, column.format());
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        return new CompiledInputTable(input, columnNames, columnFormats, node, dimensions, currentRef, queryRef, nested);
    }
}
