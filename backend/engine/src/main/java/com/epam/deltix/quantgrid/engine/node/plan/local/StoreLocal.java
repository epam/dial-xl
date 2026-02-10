package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.NotDeterministic;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import java.util.ConcurrentModificationException;
import java.util.Set;

@Slf4j
@NotSemantic
public class StoreLocal extends Plan1<Table, Table> {
    private final Store store;

    public StoreLocal(Plan source, Store store) {
        super(source);
        this.store = store;
    }

    @Override
    protected Plan layout() {
        Plan source = plan(0);
        Plan layout = source.getLayout();
        return (source == layout) ? this : layout;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    @SneakyThrows
    protected Table execute(Table table) {
        Set<Identity> identities = getIdentities();
        boolean notDeterministic = NodeUtil.unwrapOriginal(plan(0)) instanceof NotDeterministic;

        if (notDeterministic) {
            Util.verify(identities.size() == 1, "Not deterministic plan must have only 1 identity");
            Identity id = identities.iterator().next();
            int[] columns = id.columns();

            Util.verify(id.original(), "Not deterministic plan must have only 1 original identity");
            Util.verify(table.getColumnCount() == columns.length,
                    "Not deterministic plan must have same number of columns");

            for (int i = 0; i < columns.length; i++) {
                Util.verify(i == columns[i], "Not deterministic plan must have linear identity");
            }

            try {
                store.save(id, table);
            } catch (ConcurrentModificationException e) {
                table = store.load(id, getMeta());
            }

            return table;
        }

        for (Identity id : identities) {
            int[] columns = id.columns();
            Table selected = table.select(columns);
            try {
                store.save(id, selected);
            } catch (ConcurrentModificationException e) {
                // ignore
            } catch (Throwable e) {
                log.error("Failed to save result for identity {}: {}", id, e.getMessage(), e);
            }
        }

        return table;
    }
}