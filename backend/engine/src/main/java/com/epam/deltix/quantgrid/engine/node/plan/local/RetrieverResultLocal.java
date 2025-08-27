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
public class RetrieverResultLocal extends Plan1<Table, Table> implements ResultPlan {
    private final FieldKey key;
    private final long computationId;

    public RetrieverResultLocal(Plan result, FieldKey key, long computationId) {
        super(result);
        this.key = key;
        this.computationId = computationId;
    }

    @Override
    public ComputationType getComputationType() {
        return ComputationType.REQUIRED;
    }

    @Override
    protected Plan layout() {
        return source(0).plan().getLayout();
    }

    @Override
    protected Meta meta() {
        return source(0).plan().getMeta();
    }

    @Override
    public Table execute(Table result) {
        return result;
    }

    @Override
    public String toString() {
        return "RetrieverResult(%s[%s])(#%s)".formatted(key.tableName(), key.fieldName(), computationId);
    }
}
