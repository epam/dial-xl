package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.ImportMetadata;
import com.epam.deltix.quantgrid.engine.value.Table;

import java.security.Principal;

public interface ImportProvider {

    ImportMetadata readMeta(Principal principal, String project, String path, long version);

    Table readData(Principal principal, ImportMetadata meta);

}
