package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

public class SplitLocal extends Plan1<Table, Table> {
    public SplitLocal(Plan source, Expression text, Expression delimiter) {
        super(source, List.of(text, delimiter));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        Schema source = Schema.inputs(this, 0);
        Schema substring = Schema.of(ColumnType.STRING);
        return new Meta(Schema.of(source, substring));
    }

    @Override
    public Table execute(Table table) {
        StringColumn textColumn = expression(0, 0).evaluate();
        Util.verify(textColumn.size() == table.size());
        StringColumn delimiterColumn = expression(0, 1).evaluate();
        Util.verify(delimiterColumn.size() == table.size());

        int size = Util.toIntSize(table.size());
        LongArrayList refs = new LongArrayList(size);
        ObjectArrayList<String> substrings = new ObjectArrayList<>(size);

        for (int i = 0; i < size; i++) {
            String string = textColumn.get(i);
            String delimiter = delimiterColumn.get(i);

            for (String substring : StringUtils.splitByWholeSeparatorPreserveAllTokens(string, delimiter)) {
                refs.add(i);
                substrings.add(substring);
            }
        }

        Table left = LocalTable.indirectOf(table, refs);
        LocalTable right = new LocalTable(new StringDirectColumn(substrings));
        return LocalTable.compositeOf(left, right);
    }
}
