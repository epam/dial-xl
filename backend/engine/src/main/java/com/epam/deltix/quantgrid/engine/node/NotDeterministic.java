package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;

public interface NotDeterministic {
    <T extends Plan & NotDeterministic> T withLink(String link);
}
