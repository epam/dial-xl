package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.expression.Expression0;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.RequiredArgsConstructor;
import lombok.experimental.UtilityClass;

@UtilityClass
public class ProjectionUtil {

    public Identity identify(String keyPlanId, int keyIndex, String valueId, int valueIndex) {
        Plan plan = new PlanId(keyPlanId);
        Get key = new Get(plan, keyIndex);
        ExpressionId value = new ExpressionId(valueId);
        Projection projection = new Projection(key, value);
        return new Identity(projection.semanticId(), false, valueIndex);
    }

    @RequiredArgsConstructor
    private class PlanId extends Plan0<Table> {

        final String id;

        @Override
        public String semanticId() {
            return id;
        }

        @Override
        protected Plan layout() {
            throw new UnsupportedOperationException();
        }

        @Override
        protected Meta meta() {
            throw new UnsupportedOperationException();
        }

        @Override
        public Table execute() {
            throw new UnsupportedOperationException();
        }
    }

    @RequiredArgsConstructor
    private class ExpressionId extends Expression0<Column> {

        final String id;

        @Override
        public String semanticId() {
            return id;
        }

        @Override
        protected Plan layout() {
            throw new UnsupportedOperationException();
        }

        @Override
        public ColumnType getType() {
            throw new UnsupportedOperationException();
        }

        @Override
        public Column evaluate() {
            throw new UnsupportedOperationException();
        }

        @Override
        public org.apache.spark.sql.Column toSpark() {
            throw new UnsupportedOperationException();
        }
    }
}