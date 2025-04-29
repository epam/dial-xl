package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;

public class InputLocal extends Plan0<Value> {

    @Getter
    private final InputMetadata metadata;
    private final InputProvider inputProvider;
    @Getter
    private final List<String> readColumns;
    private final Principal principal;

    public InputLocal(InputMetadata metadata, InputProvider inputProvider, Principal principal) {
        this(metadata, inputProvider, columnsToRead(metadata.columnTypes()), principal);
    }

    public InputLocal(InputMetadata metadata, InputProvider inputProvider, List<String> readColumns, Principal principal) {
        this.metadata = metadata;
        this.inputProvider = inputProvider;
        this.readColumns = List.copyOf(readColumns);
        this.principal = principal;
        Util.verify(metadata.columnTypes().keySet().containsAll(readColumns),
                "Read columns should be a subset of columns from the source");
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    public boolean semanticEqual(Node node, boolean deep) {
        return (node instanceof InputLocal that) && metadata.equals(that.metadata)
                && readColumns.equals(that.readColumns);
    }

    @Override
    public String toString() {
        return "Input(" + inputProvider.name()
                + ", " + metadata.path()
                + ", " + metadata.columnTypes().keySet()
                + ", " + metadata.etag() + ")";
    }

    @Override
    protected Meta meta() {
        ColumnType[] types = readColumns.stream()
                .map(metadata.columnTypes()::get)
                .toArray(ColumnType[]::new);
        return new Meta(Schema.of(types));
    }

    @Override
    public Value execute() {
        return inputProvider.readData(readColumns, metadata, principal);
    }

    private static List<String> columnsToRead(LinkedHashMap<String, ColumnType> columnTypes) {
        return columnTypes.keySet().stream()
                .filter(key -> columnTypes.get(key) != null)
                .toList();
    }
}
