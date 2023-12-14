package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;

public interface MetadataProvider {

    /**
     * Parse provided input to get its metadata.
     *
     * @return metadata that represent input's content
     */
    InputMetadata read(String inputPath);
}
