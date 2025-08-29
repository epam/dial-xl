package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.security.Principal;
import java.util.Comparator;
import java.util.ConcurrentModificationException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@RequiredArgsConstructor
public class SchemaManager {
    private static final String SCHEMA_EXTENSION = ".schema";
    private static final String SCHEMA_PREFIX = ".";
    private static final String USER_BUCKET_PATH_PATTERN = "files/%s/";
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false);
    private static final int MAX_COLLECTION_WRITE_ATTEMPTS = 3;
    private static final int MAX_SCHEMA_FILE_SIZE_IN_BYTES = 1_000_000;

    private final DialFileApi fileApi;
    private final Principal principal;
    private final String inputPath;
    private final String schemaFile;
    private String bucketPath;

    public Schema readSchema() {
        Schema schema = readSingleSchema();
        if (schema != null) {
            return schema;
        }

        String bucket = getBucketPath();
        if (StringUtils.startsWith(inputPath, bucket)) {
            // Schemas for own files is not written to the schema collection
            return null;
        }

        SchemaCollection schemaCollection;
        try {
            schemaCollection = readSchemaCollection(getSchemaCollectionPath());
        } catch (Exception e) {
            return null;
        }

        Object schemaObject = schemaCollection.schemas().get(inputPath);
        if (schemaObject != null) {
            return getIfSupportedVersion(MAPPER.convertValue(schemaObject, Schema.class));
        }

        return null;
    }

    private String getSchemaFilePath() {
        int nameIndex = inputPath.lastIndexOf("/") + 1;
        String folder = inputPath.substring(0, nameIndex);
        String name = inputPath.substring(nameIndex);
        return folder + SCHEMA_PREFIX + FilenameUtils.removeExtension(name) + SCHEMA_EXTENSION;
    }

    private String getSchemaCollectionPath() {
        return getBucketPath() + schemaFile;
    }

    private String getBucketPath() {
        if (bucketPath != null) {
            return bucketPath;
        }

        try {
            bucketPath = USER_BUCKET_PATH_PATTERN.formatted(fileApi.getBucket(principal));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to get user bucket.", e);
        }

        return bucketPath;
    }

    private Schema readSingleSchema() {
        String path = getSchemaFilePath();
        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            log.debug("Reading cached schema: {}", path);
            byte[] bytes = stream.stream().readAllBytes();
            return getIfSupportedVersion(MAPPER.readValue(bytes, Schema.class));
        } catch (FileNotFoundException e) {
            log.debug("No schema file: {}", path);
            return null;
        } catch (Exception e) {
            log.error("Failed to read schema {}", path, e);
            return null;
        }
    }

    private SchemaCollection readSchemaCollection(String path) throws IOException {
        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            log.info("Reading cached schema collection: {}", path);
            return parseSchemaCollection(stream);
        } catch (FileNotFoundException e) {
            log.debug("No schema collection file: {}", path);
            return new SchemaCollection(null, 0, Map.of());
        }
    }

    private static SchemaCollection parseSchemaCollection(EtaggedStream stream) {
        try {
            byte[] bytes = stream.stream().readAllBytes();
            Map<String, Schema> schemaMap = MAPPER.readValue(bytes, new TypeReference<>() {
            });
            return new SchemaCollection(stream.etag(), bytes.length, schemaMap);
        } catch (Exception e) {
            log.error("Failed to parse schema collection.");
            return new SchemaCollection(stream.etag(), 0, Map.of());
        }
    }

    private static Schema getIfSupportedVersion(Schema schema) {
        return Objects.equals(schema.getVersion(), Schema.SCHEMA_VERSION)
                ? schema
                : null;
    }

    public void writeSchema(Schema schema) {
        String schemaPath = getSchemaFilePath();
        try {
            log.debug("Writing schema {}", schemaPath);
            BodyWriter bodyWriter = stream -> MAPPER.writeValue(stream, schema);
            fileApi.writeFile(schemaPath, "*", bodyWriter, "application/json", principal);
        } catch (AccessDeniedException ignore) {
            writeSchemaToCollectionFile(schema);
        } catch (Exception e) {
            log.error("Failed to write schema {}", schemaPath, e);
        }
    }

    private void writeSchemaToCollectionFile(Schema schema) {
        String path = getSchemaCollectionPath();
        for (int i = 0; i < MAX_COLLECTION_WRITE_ATTEMPTS; ++i) {
            try {
                SchemaCollection schemaCollection = readSchemaCollection(getSchemaCollectionPath());
                Map<String, Schema> schemaMap = new LinkedHashMap<>(schemaCollection.schemas());
                if (schemaCollection.sizeInBytes() > MAX_SCHEMA_FILE_SIZE_IN_BYTES) {
                    removeLeastRecentHalf(schemaMap);
                }
                Schema existing = schemaMap.put(inputPath, schema);
                if (existing != null
                        && Objects.equals(existing.getEtag(), schema.getEtag())
                        && Objects.equals(existing.getVersion(), schema.getVersion())) {
                    // Schema has already been updated
                    return;
                }

                log.debug("Writing schema for {} to {}", inputPath, path);
                BodyWriter bodyWriter = stream -> MAPPER.writeValue(stream, schemaMap);
                fileApi.writeFile(path, schemaCollection.etag(), bodyWriter, "application/json", principal);
                return;
            } catch (ConcurrentModificationException e) {
                log.info("Failed to write schema for {} to {}. Attempt {} of {}.",
                        inputPath, path, i + 1, MAX_COLLECTION_WRITE_ATTEMPTS, e);
            } catch (Exception e) {
                log.error("Failed to write schema for {} to {}.", inputPath, path, e);
                return;
            }
        }
    }

    private static void removeLeastRecentHalf(Map<String, Schema> map) {
        List<String> toRemove = map.entrySet().stream()
                .sorted(Comparator.comparing(entry -> entry.getValue().getTimestamp()))
                .map(Map.Entry::getKey)
                .limit(map.size() / 2)
                .toList();
        toRemove.forEach(map::remove);
    }
}
