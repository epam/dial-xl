package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import lombok.experimental.UtilityClass;

import java.util.Optional;

@UtilityClass
class RuleUtil {

    Scalar scalar(Graph graph) {
        Optional<Scalar> scalar = graph.getNodes().stream()
                .filter(node -> node instanceof Scalar)
                .map(value -> (Scalar) value)
                .findFirst();

        return scalar.orElseGet(Scalar::new);
    }

    boolean hasSameIdentity(Plan plan, Identity identity) {
        int size = plan.getMeta().getSchema().size();
        int[] columns = identity.columns();

        if (columns.length != size) {
            return false;
        }

        for (int i = 0; i < size; i++) {
            if (i != columns[i]) {
                return false;
            }
        }

        return true;
    }

    Identity findIdentity(Plan plan, Identity identity) {
        for (Identity id : plan.getIdentities()) {
            if (id.id().equals(identity.id())) {
                return id;
            }
        }

        throw new IllegalStateException("Can't find identity: " + identity);
    }

    Expression reduceGet(Expression expression) {
        while (expression instanceof Get get && get.plan() instanceof SelectLocal select) {
            expression = select.getExpression(get.getColumn());
        }

        return expression;
    }

    void moveIdentity(SelectLocal select, Plan target) {
        for (Identity identity : select.getIdentities()) {
            int[] columns = identity.columns().clone();

            for (int i = 0; i < columns.length; i++) {
                int from = columns[i];
                Get get = (Get) select.getExpression(from);
                Plan plan = get.plan();
                int to = get.getColumn();
                Util.verify(plan == target);
                columns[i] = to;
            }

            Identity id = new Identity(identity.id(), identity.original(), columns);
            target.getIdentities().add(id);
        }

        select.getIdentities().clear();
    }
}
