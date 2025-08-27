package com.epam.deltix.quantgrid.engine.executor;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;

public interface ExecutionHandler {

    void onSchedule(Plan original, Plan replacement);

    void onComplete(Plan original, Plan replacement);

    void onCancel(Plan original);
}