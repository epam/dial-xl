package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.type.InputColumnType;
import lombok.Getter;

import java.security.Principal;

public class InputLocal extends Plan0<Value> {

    @Getter
    private final InputMetadata metadata;
    private final InputProvider inputProvider;
    private final Principal principal;

    public InputLocal(InputMetadata metadata, InputProvider inputProvider, Principal principal) {
        this.metadata = metadata;
        this.inputProvider = inputProvider;
        this.principal = principal;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    public boolean semanticEqual(Node node, boolean deep) {
        return (node instanceof InputLocal that) && metadata.equals(that.metadata);
    }

    @Override
    public String toString() {
        return "Input(" + metadata.identifier() + ")";
    }

    @Override
    protected Meta meta() {
        ColumnType[] types = metadata.types().stream()
                .map(InputColumnType::toColumnType)
                .toArray(ColumnType[]::new);
        return new Meta(Schema.of(types));
    }

    @Override
    public Value execute() {
        return inputProvider.readData(metadata.names(), metadata, principal);
    }
}
