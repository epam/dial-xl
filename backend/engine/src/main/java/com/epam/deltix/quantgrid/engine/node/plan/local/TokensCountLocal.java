package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.knuddels.jtokkit.Encodings;
import com.knuddels.jtokkit.api.Encoding;
import com.knuddels.jtokkit.api.EncodingRegistry;
import com.knuddels.jtokkit.api.EncodingType;
import lombok.Getter;

import java.util.List;

@Getter
public class TokensCountLocal extends Plan1<Table, Table> {
    public TokensCountLocal(Plan plan, Expression... expressions) {
        super(plan, List.of(expressions));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE));
    }

    @Override
    public Table execute(Table a) {
        EncodingRegistry registry = Encodings.newDefaultEncodingRegistry();
        Encoding encoder = registry.getEncoding(EncodingType.CL100K_BASE);

        StringColumn data = source(0).expressions().get(0).evaluate();

        double[] result = new double[(int) data.size()];
        for (int i = 0; i < data.size(); ++i) {
            result[i] = encoder.encode(data.get(i)).size();
        }

        return new LocalTable(new DoubleDirectColumn(result));
    }

    @Override
    public String toString() {
        return "TokensCount()";
    }
}
