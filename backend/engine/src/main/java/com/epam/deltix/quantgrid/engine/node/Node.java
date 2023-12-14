package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import lombok.Getter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

/**
 * A base class for all nodes.
 */
public abstract class Node implements Cloneable {

    private static final AtomicLong ID_SEQUENCE = new AtomicLong();

    @Getter
    protected long id = ID_SEQUENCE.getAndIncrement();
    protected String semanticId;
    protected Plan layout;
    @Getter
    protected List<Node> inputs;
    @Getter
    protected Set<Node> outputs = new LinkedHashSet<>();
    @Getter
    protected Set<Identity> identities = new HashSet<>();

    protected Node(Node... inputs) {
        this.inputs = new ArrayList<>(inputs.length);
        Collections.addAll(this.inputs, inputs);
    }

    protected Node(List<Node> inputs) {
        this.inputs = new ArrayList<>(inputs);
    }

    public final boolean isLayout() {
        return getLayout() == this;
    }

    public final Plan getLayout() {
        if (layout == null) {
            layout = Objects.requireNonNull(layout());
        }

        return layout;
    }

    protected abstract Plan layout();

    @Override
    public final boolean equals(Object object) {
        return (object instanceof Node that) && (this.id == that.id);
    }

    @Override
    public final int hashCode() {
        return Long.hashCode(id);
    }

    public String semanticId() {
        if (semanticId == null) {
            semanticId = NodeUtil.semanticId(this);
        }

        return semanticId;
    }

    public boolean semanticEqual(Node that, boolean deep) {
        return NodeUtil.semanticEqual(this, that, deep);
    }

    @Override
    public String toString() {
        return NodeUtil.text(this);
    }

    public boolean isInvalidated() {
        return semanticId == null && layout == null;
    }

    public void invalidate() {
        semanticId = null;
        layout = null;
    }

    public boolean depends(Node node) {
        return NodeUtil.depends(this, node);
    }

    public Node copy(boolean withIdentity) {
        return clone(inputs, withIdentity);
    }

    public Node copy() {
        return copy(inputs);
    }

    public Node copy(Node... inputs) {
        return copy(List.of(inputs));
    }

    public Node copy(List<Node> inputs) {
        return clone(inputs, true);
    }

    /**
     * Clones a node with the provided inputs, clearing Node's mutable state.
     *
     * <p>This method works correctly as long as concrete implementations won't introduce
     * mutable state (arrays, mutable collections) that are modified during optimization.
     */
    protected Node clone(List<Node> inputs, boolean withIdentity) {
        Util.verify(this.inputs.size() == inputs.size(), "Cannot change inputs size");
        try {
            Node clone = (Node) super.clone();

            clone.id = ID_SEQUENCE.getAndIncrement();
            clone.inputs = new ArrayList<>(inputs);
            clone.outputs = new LinkedHashSet<>();
            clone.identities = withIdentity ? new HashSet<>(identities) : new HashSet<>();
            clone.invalidate();

            return clone;
        } catch (CloneNotSupportedException e) {
            throw new UnsupportedOperationException(e);
        }
    }
}