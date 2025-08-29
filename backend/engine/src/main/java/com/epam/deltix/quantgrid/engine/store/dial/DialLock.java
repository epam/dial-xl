package com.epam.deltix.quantgrid.engine.store.dial;

import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.ConcurrentModificationException;

@Slf4j
@RequiredArgsConstructor
public class DialLock {
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false);
    private static final String CONTENT_TYPE = "application/json";
    private static final String LOCK_NAME = "lock.json";

    private final Clock clock;
    private final DialFileApi dialFileApi;
    private final Duration accessLockTtl;
    private final Duration deleteLockTtl;

    public boolean access(String path, IOPredicate predicate, Principal principal) throws IOException {
        String lockPath = path + LOCK_NAME;
        while (true) {
            String etag;
            try (EtaggedStream etaggedStream = dialFileApi.readFile(lockPath, principal)) {
                LockInfo lockInfo = MAPPER.readValue(etaggedStream.stream(), LockInfo.class);
                if (lockInfo.lockType() != LockType.ACCESS && clock.millis() <= lockInfo.expiry) {
                    return false;
                }

                etag = etaggedStream.etag();
            } catch (FileNotFoundException ignore) {
                etag = null;
                if (!predicate.test(path)) {
                    return false;
                }
            }

            try {
                BodyWriter writer = writer(new LockInfo(LockType.ACCESS, getAccessExpiry()));
                dialFileApi.writeFile(lockPath, etag, writer, CONTENT_TYPE, principal);
                return predicate.test(path);
            } catch (ConcurrentModificationException e) {
                // Retry
            }
        }
    }

    public void deleteAfter(String path, Duration duration, IOConsumer onDelete, Principal principal)
            throws IOException {
        String lockPath = path + LOCK_NAME;
        String etag;
        try (EtaggedStream etaggedStream = dialFileApi.readFile(lockPath, principal)) {
            LockInfo lockInfo = MAPPER.readValue(etaggedStream.stream(), LockInfo.class);
            if (clock.millis() <= lockInfo.expiry + duration.toMillis()) {
                return;
            }

            etag = etaggedStream.etag();
        } catch (FileNotFoundException ignore) {
            etag = null;
        }

        try {
            BodyWriter writer = writer(new LockInfo(LockType.DELETE, getDeleteExpiry()));
            etag = dialFileApi.writeFile(lockPath, etag, writer, CONTENT_TYPE, principal);
            try {
                onDelete.accept(path);
            } finally {
                dialFileApi.deleteFile(lockPath, etag, principal);
            }
        } catch (ConcurrentModificationException e) {
            // Ignore
        }
    }

    private static BodyWriter writer(LockInfo lockInfo) {
        return stream -> MAPPER.writeValue(stream, lockInfo);
    }

    private long getAccessExpiry() {
        return clock.instant().plus(accessLockTtl).toEpochMilli();
    }

    private long getDeleteExpiry() {
        return clock.instant().plus(deleteLockTtl).toEpochMilli();
    }

    private enum LockType {
        ACCESS, DELETE
    }

    private record LockInfo(LockType lockType, long expiry) {
    }

    public interface IOConsumer {
        void accept(String path) throws IOException;
    }

    public interface IOPredicate {
        boolean test(String path) throws IOException;
    }
}
