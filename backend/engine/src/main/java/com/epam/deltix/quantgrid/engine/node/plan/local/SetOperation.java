package com.epam.deltix.quantgrid.engine.node.plan.local;

import it.unimi.dsi.fastutil.longs.LongList;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum SetOperation {
    UNION(SetOperation::addNew, SetOperation::addNew, false),
    INTERSECT(ReferenceFunction.NOOP, SetOperation::addExisting, false),
    SUBTRACT(ReferenceFunction.NOOP, SetOperation::addNew, true);

    private final ReferenceFunction onLeft;
    private final ReferenceFunction onRight;
    private final boolean swapArguments;

    @FunctionalInterface
    public interface ReferenceFunction {
        ReferenceFunction NOOP = (list, ref, isNew) -> {
        };

        void update(LongList list, long ref, boolean isNew);
    }

    public static void addNew(LongList list, long ref, boolean isNew) {
        if (isNew) {
            list.add(ref);
        }
    }

    public static void addExisting(LongList list, long ref, boolean isNew) {
        if (!isNew) {
            list.add(ref);
        }
    }
}
