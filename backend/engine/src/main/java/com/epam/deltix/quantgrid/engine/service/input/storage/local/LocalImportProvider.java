package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.ImportMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.ImportProvider;
import com.epam.deltix.quantgrid.engine.value.Table;

import java.security.Principal;

public class LocalImportProvider implements ImportProvider {
    @Override
    public ImportMetadata readMeta(Principal principal, String project, String path, long version) {
        throw new UnsupportedOperationException("Import feature is disabled");
    }

    @Override
    public Table readData(Principal principal, ImportMetadata meta) {
        throw new UnsupportedOperationException("Import feature is disabled");
    }
}
