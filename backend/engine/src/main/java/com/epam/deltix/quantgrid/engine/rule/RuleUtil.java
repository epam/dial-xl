package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import lombok.experimental.UtilityClass;

@UtilityClass
class RuleUtil {

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
}
