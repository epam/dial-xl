package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.service.input.ImportMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.ImportProvider;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.type.InputColumnType;
import lombok.Getter;

import java.security.Principal;
import java.util.List;

public class ImportLocal extends Plan0<Table> {

    @NotSemantic
    private final Principal principal;
    @NotSemantic
    private final ImportMetadata meta;
    @NotSemantic
    private final ImportProvider provider;
    @Getter
    private final String path;

    public ImportLocal(Principal principal, ImportMetadata meta, ImportProvider provider) {
        this.principal = principal;
        this.meta = meta;
        this.provider = provider;
        this.path = meta.path();
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        List<ColumnType> types = meta.columns().values().stream()
                .map(type -> type == InputColumnType.STRING ? ColumnType.STRING : ColumnType.DOUBLE)
                .toList();
        return new Meta(Schema.of(types));
    }

    @Override
    public Table execute() {
        return provider.readData(principal, meta);
    }
}
