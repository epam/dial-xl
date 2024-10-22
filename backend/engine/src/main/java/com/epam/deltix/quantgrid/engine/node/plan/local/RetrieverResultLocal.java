package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.Getter;

@Getter
public class RetrieverResultLocal extends Plan1<Table, Table> {
    private final FieldKey key;

    public RetrieverResultLocal(FieldKey key, Plan result) {
        super(result);
        this.key = key;
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
        return "RetrieverResult(%s[%s])".formatted(key.tableName(), key.fieldName());
    }
}
