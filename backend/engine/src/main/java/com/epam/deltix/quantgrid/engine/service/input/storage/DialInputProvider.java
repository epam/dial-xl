package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.Schema;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.SchemaManager;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@AllArgsConstructor
public class DialInputProvider implements InputProvider {
    private final DialFileApi fileApi;
    private final String schemaFile;

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        DialFileApi.Attributes attributes = measure(() -> fileApi.getAttributes(input, principal),
                "Reading attributes: {}", input);

        if (!attributes.permissions().contains("READ")) {
            throw new IllegalArgumentException("No access to %s".formatted(input));
        }

        if (attributes.etag() == null) {
            throw new NullPointerException("Missing ETag for %s".formatted(input));
        }

        InputType inputType = InputType.fromName(input);
        SchemaManager schemaManager = new SchemaManager(fileApi, principal, input, schemaFile);

        Schema schema = schemaManager.readSchema();
        if (schema != null && attributes.etag().equals(schema.getEtag())) {
            if (schema.getError() != null) {
                throw new InvalidInputException(schema.getEtag(), schema.getError());
            }

            return new InputMetadata(input, input, schema.getEtag(), inputType, schema.getColumns());
        }

        try {
            InputMetadata metadata = measure(() -> InputUtils.readMetadata(this::getStream, input, input, inputType, principal),
                            "Inferring schema: {}", input);
            schema = new Schema(metadata.columnTypes(), metadata.etag());
            schemaManager.writeSchema(schema);
            return metadata;
        } catch (InvalidInputException e) {
            schema = new Schema(e.getMessage(), e.getEtag());
            schemaManager.writeSchema(schema);
            throw e;
        }
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        return InputUtils.readTable(this::getStream, readColumns, metadata, principal);
    }

    @Override
    public String name() {
        return "Dial";
    }

    private EtaggedStream getStream(String inputPath, Principal principal) throws IOException {
        return fileApi.readFile(inputPath, principal);
    }

    private static <T> T measure(Supplier<T> function, String message, Object arg) {
        boolean enabled = log.isDebugEnabled();
        long start = enabled ? System.currentTimeMillis(): 0;
        T result = function.get();
        long end = enabled ? System.currentTimeMillis(): 0;

        if (enabled) {
            log.debug("Time: " + (end - start) + " ms. " + message, arg);
        }

        return result;
    }

}
