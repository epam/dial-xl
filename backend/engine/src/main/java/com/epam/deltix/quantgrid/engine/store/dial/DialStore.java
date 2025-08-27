package com.epam.deltix.quantgrid.engine.store.dial;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.store.StoreUtils;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ConcurrentModificationException;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@RequiredArgsConstructor
public class DialStore implements Store {
    private static final String DATA_NAME = "data.csv";

    private final Clock clock;
    private final DialFileApi dialFileApi;
    private final DialLock lock;
    private final Principal principal;
    private final String folder;
    private final Duration refreshInterval;
    private final Duration deleteAfter;
    private final ConcurrentMap<Identity, Instant> locks = new ConcurrentHashMap<>();
    private String basePath;

    @PostConstruct
    public void init() throws IOException {
        basePath = "files/" + dialFileApi.getBucket(principal) + "/";
    }

    @Override
    public Table load(Identity id, Meta meta) throws IOException {
        String dataPath = getResultPath(id) + DATA_NAME;
        log.info("Loading data from {}", dataPath);
        try (EtaggedStream stream = dialFileApi.readFile(dataPath, principal)) {
            return StoreUtils.readTable(stream.stream(), List.of(meta.getSchema().getTypes()));
        }
    }

    @Override
    public void save(Identity id, Table table) throws IOException {
        String resultPath = getResultPath(id);
        String dataPath = resultPath + DATA_NAME;
        BodyWriter bodyWriter = stream -> StoreUtils.writeTable(stream, table);
        try {
            log.info("Writing data to {}", dataPath);
            dialFileApi.writeFile(dataPath, null, bodyWriter, "text/csv", principal);
        } catch (ConcurrentModificationException e) {
            log.debug("File already exists, skipping save for {}", id.id());
        }
        lock.access(resultPath, path -> true, principal);
    }

    @Override
    public boolean lock(Identity id) {
        String resultPath = getResultPath(id);
        try {
            if (lock.access(resultPath, path -> dialFileApi.exists(path + DATA_NAME, principal), principal)) {
                locks.put(id, getRefreshTime());
                return true;
            }
        } catch (Throwable e) {
            log.error("Failed to lock data at {}", resultPath, e);
        }

        return false;
    }

    @Override
    public void unlock(Identity id) {
        locks.remove(id);
    }

    @Override
    public Set<Identity> locks() {
        return locks.keySet();
    }

    public void cleanup() {
        try {
            log.info("Starting cleanup of result files older than {}", deleteAfter);
            String currentPath = null;
            long updatedAt = 0;
            for (DialFileApi.Attributes attributes : dialFileApi.listAttributes(getResultsPath(), principal)) {
                if (Objects.equals(attributes.parentPath(), currentPath)) {
                    updatedAt = Math.max(updatedAt, attributes.updatedAt());
                } else {
                    deleteExpired(currentPath, deleteAfter, updatedAt);

                    currentPath = attributes.parentPath();
                    updatedAt = attributes.updatedAt();
                }
            }
            deleteExpired(currentPath, deleteAfter, updatedAt);
            log.info("Cleanup of result files completed");
        } catch (Throwable e) {
            log.error("Failed to cleanup expired data", e);
        }
    }

    private void deleteExpired(String currentPath, Duration deleteAfterSec, long updatedAt) {
        if (currentPath != null && clock.millis() > updatedAt + deleteAfterSec.toMillis()) {
            String resultPath = getFolderPath(currentPath);
            try {
                lock.deleteAfter(
                        resultPath,
                        deleteAfterSec,
                        path -> dialFileApi.deleteFile(path + DATA_NAME, "*", principal),
                        principal);
            } catch (Throwable e) {
                log.error("Failed to delete expired data at {}", resultPath, e);
            }
        }
    }

    public void refreshLocks() {
        Set<Identity> keys = Set.copyOf(locks.keySet());
        for (Identity key : keys) {
            Instant refreshTime = locks.get(key);
            if (refreshTime == null) {
                continue;
            }

            if (clock.instant().isBefore(refreshTime)) {
                continue;
            }

            try {
                String resultPath = getResultPath(key);
                if (!lock.access(resultPath, path -> true, principal)) {
                    log.warn("Failed to refresh lock for {}: lock is not available", key);
                }
                locks.computeIfPresent(key, (k, v) -> getRefreshTime());
            } catch (Throwable e) {
                log.error("Failed to refresh lock for {}", key, e);
            }
        }
    }

    private Instant getRefreshTime() {
        return clock.instant().plus(refreshInterval);
    }

    private String getResultPath(Identity id) {
        return getResultsPath() + id.id() + "/";
    }

    private String getResultsPath() {
        return getFolderPath(folder);
    }

    private String getFolderPath(String folder) {
        return basePath + folder + (folder.endsWith("/") ? "" : "/");
    }
}
