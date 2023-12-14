package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.List;

public interface InputProvider {

    /**
     * Reads specified columns into a table using provided metadata of the source.
     *
     * @param readColumns columns to read from the input source
     * @param metadata metadata with columns and types information
     * @return a table for provided read columns
     */
    Value read(List<String> readColumns, InputMetadata metadata);

    /**
     * Human-readable name of the provider.
     */
    String name();
}
