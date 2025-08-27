package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.extern.slf4j.Slf4j;

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
    protected Table execute(Table table) {
        for (Identity id : getIdentities()) {
            int[] columns = id.columns();
            Table selected = table.select(columns);
            try {
                store.save(id, selected);
            } catch (Throwable e) {
                log.error("Failed to save result for identity {}: {}", id, e.getMessage(), e);
            }
        }

        return table;
    }
}