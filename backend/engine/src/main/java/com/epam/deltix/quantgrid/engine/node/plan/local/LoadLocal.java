package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@NotSemantic
public class LoadLocal extends PlanN<Value, Value> {
    private final Store store;
    private final Plan original;
    private final List<Identity> ids;
    private final List<Meta> metas;

    public LoadLocal(Store store, Plan original, List<Identity> ids, List<Meta> metas) {
        super(original.isLayout() ? List.of() : List.of(Plan.sourceOf(original.getLayout())));
        this.store = store;
        this.original = original;
        this.ids = ids;
        this.metas = metas;
    }

    @Override
    protected Plan layout() {
        return (planCount == 0) ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        Schema[] schemas = metas.stream()
                .map(Meta::getSchema)
                .toArray(Schema[]::new);
        return new Meta(Schema.of(schemas));
    }

    @Override
    @SneakyThrows
    public Value execute(List<Value> args) {
        List<Column> columns = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            Identity id = ids.get(i);
            Meta meta = metas.get(i);
            Table table = store.load(id, meta);
            for (Column column : table.getColumns()) {
                columns.add(column);
            }
        }

        return new LocalTable(columns);
    }

    @Override
    public void onExecution(Value value, Throwable error) {
        ids.forEach(store::unlock);
    }

    public LoadLocal append(List<Identity> ids, List<Meta> metas) {
        List<Identity> newIdentities = new ArrayList<>(this.ids);
        newIdentities.addAll(ids);
        List<Meta> newTypes = new ArrayList<>(this.metas);
        newTypes.addAll(metas);
        return new LoadLocal(store, original, newIdentities, newTypes);
    }

    @Override
    public String toString() {
        return "Load(" + original + "#" + original.getId() + ")";
    }
}
