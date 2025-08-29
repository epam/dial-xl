package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.Getter;

@Getter
public class IndexResultLocal extends Plan1<Table, Table> implements ResultPlan {
    private final FieldKey key;
    private final long computationId;
    private final ComputationType computationType;

    public IndexResultLocal(Plan source, FieldKey key, long computationId, ComputationType computationType) {
        super(source);
        this.key = key;
        this.computationId = computationId;
        this.computationType = computationType;
    }

    public Plan getSource() {
        return plan(0);
    }

    @Override
    protected Plan layout() {
        return getSource().getLayout();
    }

    @Override
    protected Meta meta() {
        return getSource().getMeta();
    }

    @Override
    public Table execute(Table source) {
        return source;
    }

    @Override
    public String toString() {
        return "IndexResult(%s, %s)(#%s)".formatted(key, computationType, computationId);
    }
}
