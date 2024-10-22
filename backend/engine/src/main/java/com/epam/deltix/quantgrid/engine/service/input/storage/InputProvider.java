package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.security.Principal;
import java.util.List;

public interface InputProvider {
    /**
     * Parse provided input to get its metadata.
     *
     * @return metadata that represent input's content
     */
    InputMetadata readMetadata(String input, Principal principal);

    /**
     * Reads specified columns into a table using provided metadata of the source.
     *
     * @param readColumns columns to read from the input source
     * @param metadata metadata with columns and types information
     * @return a table for provided read columns
     */
    Value readData(List<String> readColumns, InputMetadata metadata, Principal principal);

    /**
     * Human-readable name of the provider.
     */
    String name();
}
