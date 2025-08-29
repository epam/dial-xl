package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.parser.ParsedKey;

public interface ResultPlan {
    ParsedKey getKey();
    long getComputationId();
    ComputationType getComputationType();
}