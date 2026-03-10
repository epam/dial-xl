package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.ImportLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public class CompiledImportTable extends CompiledAbstractTable {

    private final ImportLocal input;
    private final List<String> names;
    private final List<ColumnFormat> formats;

    public CompiledImportTable(ImportLocal input, List<String> names, List<ColumnFormat> formats, Plan node) {
        this(input, names, formats, node, List.of(), REF_NA, 0, true);
        CompileUtil.verify(node.getMeta().getSchema().size() == 1);
    }

    private CompiledImportTable(ImportLocal input, List<String> names, List<ColumnFormat> formats,
                                Plan node, List<FieldKey> dimensions,
                                int currentRef, int queryRef, boolean nested) {
        super(node, dimensions, currentRef, queryRef, nested);
        this.input = input;
        this.names = names;
        this.formats = formats;
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
        return "Import(" + input.getPath() + ")";
    }

    @Override
    public List<String> fields(CompileContext context) {
        return names;
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        int index = names.indexOf(name);
        CompileUtil.verify(index != -1, "Unknown field [%s] in IMPORT", name);

        Get inputRef = queryReference();
        Get inputColumn = new Get(input, index);
        ColumnFormat format = formats.get(index);
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
        return new CompiledImportTable(input, names, formats, node, dimensions, currentRef, queryRef, nested);
    }
}
