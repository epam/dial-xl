package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;

import java.util.List;

public class GapFillerJoinSpark extends JoinAllSpark {

    public GapFillerJoinSpark(Plan carry, Get leftRef, Plan nested, Get nestedLeftRef) {
        super(carry, List.of(leftRef), nested, List.of(nestedLeftRef), JoinType.LEFT);
    }
}
