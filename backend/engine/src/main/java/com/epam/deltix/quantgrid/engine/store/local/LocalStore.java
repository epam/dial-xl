package com.epam.deltix.quantgrid.engine.store.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.store.StoreUtils;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Set;
import javax.annotation.PostConstruct;

@RequiredArgsConstructor
public class LocalStore implements Store {
    private final Path path;

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(path);
    }

    @Override
    public boolean lock(Identity id) {
        return Files.exists(path.resolve(id.id()));
    }

    @Override
    public void unlock(Identity id) {
    }

    @Override
    public Set<Identity> locks() {
        return Set.of();
    }

    @Override
    public Table load(Identity id, Meta meta) throws IOException {
        try (InputStream stream = Files.newInputStream(path.resolve(id.id()))) {
            return StoreUtils.readTable(stream, List.of(meta.getSchema().getTypes()));
        }
    }

    @Override
    public void save(Identity id, Table table) throws IOException {
        try (OutputStream stream = Files.newOutputStream(path.resolve(id.id()), StandardOpenOption.CREATE_NEW)) {
            StoreUtils.writeTable(stream, table);
        } catch (FileAlreadyExistsException e) {
            // Ignore
        }
    }
}
