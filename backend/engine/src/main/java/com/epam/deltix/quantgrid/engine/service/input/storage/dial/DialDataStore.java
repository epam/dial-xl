package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
import com.epam.deltix.quantgrid.engine.store.StoreUtils;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
public class DialDataStore implements DataStore {
    private final DialFileApi fileApi;

    @Override
    public Table readTable(String path, List<ColumnType> columnTypes, Principal principal) throws IOException {
        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            return StoreUtils.readTable(stream.stream(), columnTypes, true);
        }
    }

    @Override
    public void writeTable(String path, Table table, Principal principal) throws IOException {
        BodyWriter bodyWriter = stream -> StoreUtils.writeTable(stream, table, true);
        log.info("Writing data to {}", path);
        fileApi.writeFile(path, null, bodyWriter, "text/csv", principal);
    }
}
