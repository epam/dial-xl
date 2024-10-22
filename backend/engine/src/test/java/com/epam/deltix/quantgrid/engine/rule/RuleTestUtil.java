package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.UtilityClass;

@UtilityClass
public class RuleTestUtil {

    public String TEST_TABLE = "test_table";
    public String TEST_FIELD = "test_field";

    ViewportLocal assignViewport(Node node) {
        Expression data;
        if (node instanceof Expression expression) {
            data = expression;
        } else if (node instanceof Plan plan) {
            data = new Get(plan, 0);
        } else {
            throw new UnsupportedOperationException("Unsupported node: " + node.getClass().getSimpleName());
        }
        return new ViewportLocal(data, null, new FieldKey(TEST_TABLE, TEST_FIELD), 0, 100, true);
    }
}
