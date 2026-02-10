package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
import com.epam.deltix.quantgrid.engine.store.StoreUtils;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.Principal;
import java.util.List;

public class LocalDataStore implements DataStore {
    @Override
    public Table readTable(String path, List<ColumnType> columnTypes, Principal principal) throws IOException {
        try (InputStream stream = Files.newInputStream(Path.of(path))) {
            return StoreUtils.readTable(stream, columnTypes, true);
        }
    }

    @Override
    public void writeTable(String path, Table table, Principal principal) throws IOException {
        Path file = Path.of(path);
        Path folder = file.getParent();

        if (folder != null) {
            Files.createDirectories(folder);
        }

        try (OutputStream stream = Files.newOutputStream(file, StandardOpenOption.CREATE_NEW)) {
            StoreUtils.writeTable(stream, table, true);
        } catch (FileAlreadyExistsException e) {
            // Ignore
        }
    }
}
