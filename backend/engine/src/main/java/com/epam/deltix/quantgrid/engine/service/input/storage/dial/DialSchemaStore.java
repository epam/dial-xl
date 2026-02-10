package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvSchemaEntry;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvSchemaFile;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvTable;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DatabindException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.ConcurrentModificationException;
import java.util.function.UnaryOperator;
import javax.annotation.PostConstruct;

@Slf4j
@RequiredArgsConstructor
public class DialSchemaStore {
    private static final TypeReference<CsvSchemaFile> CSV_TYPE_REFERENCE = new TypeReference<>() {
    };
    private static final int MAX_WRITE_ATTEMPTS = 3;
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false);

    private final Clock clock;
    private final DialFileApi fileApi;
    private final Principal principal;
    private final String folder;
    private final Duration updateAfter;
    private final Duration deleteAfter;
    private String basePath;

    @PostConstruct
    public void init() throws IOException {
        basePath = "files/" + fileApi.getBucket(principal) + "/" + StringUtils.strip(folder, "/") + "/";
    }

    public CsvTable loadCsvSchema(String path) {
        String fullPath = getFullPath(path);
        try {
            CsvSchemaFile file = loadWithEtag(fullPath).getValue();
            CsvSchemaEntry entry = file.entry();
            if (entry != null) {
                long now = clock.millis();
                if (now > entry.timestamp() + updateAfter.toMillis()) {
                    storeCsvSchemaFile(path, existing -> existing.withEntry(entry.withTimestamp(now)));
                }

                return entry.getValueOrThrow();
            }
        } catch (Exception e) {
            log.error("Failed to load schema file: {}", fullPath, e);
        }

        return null;
    }

    public void storeCsvSchema(String path, CsvTable schema) {
        CsvSchemaEntry entry = new CsvSchemaEntry(schema, null, clock.millis());
        storeCsvSchemaFile(path, existing -> existing.withEntry(entry));
    }

    public void storeCsvError(String path, String error) {
        CsvSchemaEntry entry = new CsvSchemaEntry(null, error, clock.millis());
        storeCsvSchemaFile(path, existing -> existing.withEntry(entry));
    }

    private void storeCsvSchemaFile(String path, UnaryOperator<CsvSchemaFile> resolver) {
        String fullPath = getFullPath(path);
        try {
            for (int i = 0; i < MAX_WRITE_ATTEMPTS; ++i) {
                try {
                    Pair<String, CsvSchemaFile> pair = loadWithEtag(fullPath);
                    CsvSchemaFile schema = resolver.apply(pair.getValue());
                    log.info("Writing schema to {}", fullPath);
                    BodyWriter bodyWriter = stream -> MAPPER.writeValue(stream, schema);
                    fileApi.writeFile(fullPath, pair.getKey(), bodyWriter, "application/json", principal);
                    return;
                } catch (ConcurrentModificationException e) {
                    log.info("Failed to write schema to {}. Attempt {} of {}.", fullPath, i + 1, MAX_WRITE_ATTEMPTS, e);
                }
            }
            log.info("Failed to write schema to {} after {} attempts.", fullPath, MAX_WRITE_ATTEMPTS);
        } catch (Exception e) {
            log.error("Failed to store schema file: {}", fullPath, e);
        }
    }

    private Pair<String, CsvSchemaFile> loadWithEtag(String fullPath)
            throws IOException {
        try (EtaggedStream stream = fileApi.readFile(fullPath, principal)) {
            log.info("Loading schema file: {}", fullPath);
            try {
                CsvSchemaFile schemaFile = MAPPER.readValue(stream.stream(), DialSchemaStore.CSV_TYPE_REFERENCE);
                return Pair.of(stream.etag(), schemaFile);
            } catch (DatabindException e) {
                log.warn("Failed to deserialize schema file: {}. Returning empty schema file.", fullPath, e);
                return Pair.of(stream.etag(), CsvSchemaFile.EMPTY);
            }
        } catch (FileNotFoundException e) {
            log.debug("Schema file not found: {}. Returning empty schema file.", fullPath);
            return Pair.of(null, CsvSchemaFile.EMPTY);
        }
    }

    private String getFullPath(String path) {
        return basePath + path;
    }

    public void cleanup() {
        try {
            log.info("Starting cleanup of schema files older than {}", deleteAfter);
            for (DialFileApi.Attributes attributes : fileApi.listAttributes(basePath, principal)) {
                if (clock.millis() > attributes.updatedAt() + deleteAfter.toMillis()) {
                    delete(attributes.fullPath(), attributes.etag());
                }
            }
            log.info("Completed cleanup of expired schema files");
        } catch (Throwable e) {
            log.error("Failed to cleanup expired schema files in {}", basePath, e);
        }
    }

    private void delete(String path, String etag) {
        try {
            fileApi.deleteFile(path, etag, principal);
        } catch (FileNotFoundException e) {
            log.debug("Schema file already deleted: {}", path);
        } catch (Throwable e) {
            log.error("Failed to delete expired schema file at {}", path, e);
        }
    }
}