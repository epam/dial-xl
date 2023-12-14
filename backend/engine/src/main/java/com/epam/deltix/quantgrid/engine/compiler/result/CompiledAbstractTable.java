package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RequiredArgsConstructor
public abstract class CompiledAbstractTable implements CompiledTable {

    protected final Plan node;
    protected final List<FieldKey> dimensions;
    protected final int currentRef;
    protected final int queryRef;
    protected final boolean nested;

    @Override
    public Plan node() {
        return node;
    }

    @Override
    public List<FieldKey> dimensions() {
        return dimensions;
    }

    @Override
    public int currentRef() {
        return currentRef;
    }

    @Override
    public int queryRef() {
        return queryRef;
    }

    @Override
    public boolean nested() {
        return nested;
    }
}