package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.ImportMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
import com.epam.deltix.quantgrid.engine.service.input.storage.ImportProvider;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.io.Closeable;
import java.io.FileNotFoundException;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RequiredArgsConstructor
public class DialImportProvider implements ImportProvider {

    private static final String SOURCES_FILE = ".import-sources.json";
    private static final String SYNCS_FILE = ".import-syncs.json";

    public static final JsonMapper MAPPER = JsonMapper.builder()
            .disable(JsonGenerator.Feature.AUTO_CLOSE_TARGET)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private final DialFileApi dial;
    private final DataStore dataStore;

    public Sources loadSources(Principal principal, String folder) {
        String path = folder + SOURCES_FILE;
        try (EtaggedStream stream = dial.readFile(path, principal)) {
            byte[] bytes = stream.stream().readAllBytes();
            return MAPPER.readValue(bytes, Sources.class);
        } catch (FileNotFoundException error) {
            return new Sources();
        } catch (Throwable error) {
            log.warn("Failed to load import sources from file: {}", path, error);
            throw new IllegalStateException(error);
        }
    }

    public void saveSources(Principal principal, String folder, Sources sources) {
        String path = folder + SOURCES_FILE;
        try {
            BodyWriter writer = stream -> MAPPER.writeValue(stream, sources);
            dial.writeFile(path, "*", writer, "application/json", principal);
        } catch (Throwable error) {
            log.warn("Failed to save import sources to file: {}", path, error);
            throw new IllegalStateException(error);
        }
    }

    public Syncs loadSyncs(Principal principal, String folder) {
        String path = folder + SYNCS_FILE;
        try (EtaggedStream stream = dial.readFile(path, principal)) {
            byte[] bytes = stream.stream().readAllBytes();
            return MAPPER.readValue(bytes, Syncs.class);
        } catch (FileNotFoundException e) {
            return new Syncs();
        } catch (Throwable error) {
            log.warn("Failed to load import syncs from file: {}", path, error);
            throw new IllegalStateException(error);
        }
    }

    public void saveSyncs(Principal principal, String folder, Syncs syncs) {
        String path = folder + SYNCS_FILE;
        try {
            BodyWriter writer = stream -> MAPPER.writeValue(stream, syncs);
            dial.writeFile(path, "*", writer, "application/json", principal);
        } catch (Throwable error) {
            log.warn("Failed to save import syncs to file: {}", path, error);
            throw new IllegalStateException(error);
        }
    }

    @Override
    public ImportMetadata readMeta(Principal principal, String project, String path, long version) {
        String file = getProjectFile(project);
        String folder = getProjectFolder(project);

        int separator = path.indexOf('/');
        if (separator < 0 || path.startsWith("/") || path.endsWith("/")) {
            throw new IllegalArgumentException("Path: " + path + " is invalid");
        }

        String name = path.substring(0, separator);
        String dataset = path.substring(separator + 1);

        Sources sources = loadSources(principal, folder);
        Syncs syncs = loadSyncs(principal, folder);

        Source source = null;
        Sync sync = null;

        for (Source candidate : sources.getSources().values()) {
            if (candidate.getName().equals(name)) {
                source = candidate;
                break;
            }
        }

        if (source == null) {
            throw new IllegalArgumentException("Import source is not found");
        }

        for (Sync candidate : syncs.getSyncs().values()) {
            if (candidate.getSource().equals(source.getSource())
                    && candidate.getDataset().equals(dataset)
                    && candidate.getVersion() == version) {
                sync = candidate;
                break;
            }
        }

        if (sync == null) {
            throw new IllegalArgumentException("Import sync is not found");
        }

        if (sync.getStatus() == Sync.Status.FAILED) {
            throw new IllegalArgumentException("Import sync failed");
        }

        LinkedHashMap<String, InputColumnType> columns = new LinkedHashMap<>();

        for (DataSchema.Column column : sync.getSchema().getColumns().values()) {
            String columnName = column.getColumn();
            InputColumnType columnType = column.getTarget();

            columns.put(columnName, columnType);
        }

        String location = StringUtils.isBlank(sync.getPath())
                ? "%s.imports/%s/data.csv".formatted(folder, sync.getSync())
                : sync.getPath();
        boolean active = (sync.getStatus() == Sync.Status.RUNNING);

        return new ImportMetadata(location, project,
                sync.getSource(), sync.getSync(), sync.getDataset(),
                version, active, columns);
    }

    @Override
    @SneakyThrows
    public Table readData(Principal principal, ImportMetadata meta) {
        if (meta.active()) {
            String project = meta.project();
            String folder = getProjectFolder(project);
            String file = folder + SYNCS_FILE;

            CompletableFuture<Void> future = new CompletableFuture<>();
            DialFileApi.FileContentSubscriber subscriber = new DialFileApi.FileContentSubscriber() {
                @Override
                public void onUpdate(byte[] content) throws Throwable {
                    Syncs syncs = MAPPER.readValue(content, Syncs.class);
                    Sync sync = syncs.getSyncs().get(meta.sync());

                    if (sync == null) {
                        onDelete();
                    } else if (sync.getStatus() == Sync.Status.FAILED) {
                        onError(null);
                    } else if (sync.getStatus() == Sync.Status.SUCCEEDED) {
                        future.complete(null);
                    }
                }

                @Override
                public void onDelete() {
                    IllegalArgumentException error = new IllegalArgumentException("Import sync is not found");
                    future.completeExceptionally(error);
                }

                @Override
                public void onError(Throwable e) {
                    IllegalArgumentException error = new IllegalArgumentException("Import sync failed");
                    future.completeExceptionally(error);
                }
            };

            try (Closeable subscription = dial.subscribeOnFileContentEvents(file, subscriber, principal)) {
                future.get();
            }
        }

        List<ColumnType> columnTypes = meta.columns().values().stream()
                .map(InputColumnType::toColumnType)
                .toList();
        return dataStore.readTable(meta.path(), columnTypes, principal);
    }

    public String getProjectFile(String path) {
        if (path == null || path.isEmpty()) {
            throw new IllegalArgumentException("Project is not specified");
        }

        if (path.endsWith("/") || !path.startsWith("files/") || path.endsWith(".qg")) {
            throw new IllegalArgumentException("Project: " + path + " is invalid");
        }

        return path + ".qg";
    }

    public String getProjectFolder(String path) {
        if (path == null || path.isEmpty()) {
            throw new IllegalArgumentException("Project is not specified");
        }

        if (path.endsWith("/") || !path.startsWith("files/") || path.endsWith(".qg")) {
            throw new IllegalArgumentException("Project: " + path + " is invalid");
        }

        int mid = path.indexOf('/', "files/".length());
        String prefix = path.substring(0, mid);
        String suffix = path.substring(mid);
        return prefix + "/appdata/xl" + suffix + "/";
    }

    @Data
    public static class Sources {
        private LinkedHashMap<String, Source> sources = new LinkedHashMap<>();
    }

    @Data
    public static class Source {
        private String definition;
        private String source;
        private String name;
        private JsonNode configuration;
    }

    @Data
    public static class Syncs {
        private LinkedHashMap<String, Sync> syncs = new LinkedHashMap<>();
    }

    @Data
    public static class Sync {
        private String definition;
        private String source;
        private String dataset;
        private DataSchema schema;
        private String sync;
        private String path;
        private Status status;
        private Long startedAt;
        private Long stoppedAt;
        private long version;

        public enum Status {
            RUNNING, SUCCEEDED, FAILED
        }
    }

}
