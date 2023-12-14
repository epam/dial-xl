package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class CompiledInputTable extends CompiledAbstractTable {

    private final InputLocal input;
    private final List<String> columnNames;
    private final List<ColumnType> columnTypes;

    public CompiledInputTable(InputLocal input, List<String> columnNames, List<ColumnType> columnTypes, Plan node) {
        this(input, columnNames, columnTypes, node, List.of(), REF_NA, 0, true);
        CompileUtil.verify(node.getMeta().getSchema().size() == 1);
    }

    private CompiledInputTable(InputLocal input, List<String> columnNames, List<ColumnType> columnTypes,
                               Plan node, List<FieldKey> dimensions,
                               int currentRef, int queryRef, boolean nested) {
        super(node, dimensions, currentRef, queryRef, nested);
        this.input = input;
        this.columnNames = columnNames;
        this.columnTypes = columnTypes;
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
        ColumnType type = columnTypes.get(index);

        Get inputRef = queryReference();
        Get inputColumn = new Get(input, index);
        CompiledColumn column = CompileUtil.projectColumn(inputRef, inputColumn, dimensions);

        if (!nested) {
            return column;
        }

        if (!hasCurrentReference()) {
            SelectLocal select = new SelectLocal(column.node());
            return new CompiledNestedColumn(select, 0);
        }

        SelectLocal select = new SelectLocal(currentReference(), column.node());
        return new CompiledNestedColumn(select, dimensions, 0, 1);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        return new CompiledInputTable(input, columnNames, columnTypes, node, dimensions, currentRef, queryRef, nested);
    }
}
