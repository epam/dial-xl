package com.epam.deltix.quantgrid.engine.store.dial;

import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.ConcurrentModificationException;
import java.util.Objects;

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

    public String link(String linkId, String fromPath, String toPath, Principal principal) throws IOException {
       boolean created = false;

       while (true) {
           Pair<String, LockInfo> pair = read(principal, fromPath);
           String etag = pair.getKey();
           LockInfo lock = pair.getValue();

           if (lock != null && (lock.lockType() == LockType.DELETE || lock.linkId() == null)) {
               lock = null;
           }

           if (lock != null) {
               LockInfo toLock = accessIfExists(lock.linkPath(), principal);
               if (toLock == null || !Objects.equals(toLock.linkId(), lock.linkId())) {
                   lock = null;
               }
           }

           if (lock == null) {
               lock = new LockInfo(LockType.ACCESS, getAccessExpiry(), linkId, toPath);

               if (!created) {
                   write(principal, toPath, "*", lock);
                   created = true;
               }
           }

           try {
               lock = new LockInfo(LockType.ACCESS, getAccessExpiry(), lock.linkId(), lock.linkPath());
               write(principal, fromPath, etag, lock);
               return lock.linkId();
           } catch (ConcurrentModificationException e) {
               // Retry
           }
       }
    }

    private LockInfo accessIfExists(String path, Principal principal) throws IOException {
        while (true) {
            Pair<String, LockInfo> pair = read(principal, path);
            String etag = pair.getKey();
            LockInfo lock = pair.getValue();

            if (lock == null || lock.lockType() == LockType.DELETE) {
                return null;
            }

            try {
                lock = new LockInfo(LockType.ACCESS, getAccessExpiry(), lock.linkId(), lock.linkPath());
                write(principal, path, etag, lock);
                return lock;
            } catch (ConcurrentModificationException e) {
                // Retry
            }
        }
    }

    public boolean access(String path, IOPredicate predicate, Principal principal) throws IOException {
        while (true) {
            Pair<String, LockInfo> pair = read(principal, path);
            String etag = pair.getKey();
            LockInfo lock = pair.getValue();

            if (lock != null && lock.lockType() == LockType.DELETE && clock.millis() <= lock.expiry()) {
                return false;
            }
            
            if (lock == null && !predicate.test(path)) {
                return false;
            }

            try {
                lock = new LockInfo(LockType.ACCESS, getAccessExpiry(), lock == null ? null : lock.linkId(),
                        lock == null ? null : lock.linkPath());

                write(principal, path, etag, lock);
                return predicate.test(path);
            } catch (ConcurrentModificationException e) {
                // Retry
            }
        }
    }

    public void deleteAfter(String path, Duration duration, IOConsumer onDelete, Principal principal)
            throws IOException {

        Pair<String, LockInfo> pair = read(principal, path);
        String etag = pair.getKey();
        LockInfo lock = pair.getValue();

        if (lock != null && clock.millis() <= lock.expiry() + duration.toMillis()) {
            return;
        }
       
        try {
            etag = write(principal, path, etag, new LockInfo(LockType.DELETE, getDeleteExpiry(), null, null));
           
            try {
                onDelete.accept(path);
            } finally {
                delete(path, principal, etag);
            }
        } catch (ConcurrentModificationException e) {
            // Ignore
        }
    }
    
    private Pair<String, LockInfo> read(Principal principal, String path) throws IOException {
        try (EtaggedStream stream = dialFileApi.readFile(path + LOCK_NAME, principal)) {
            String etag = stream.etag();
            LockInfo lock = MAPPER.readValue(stream.stream(), LockInfo.class);
            return Pair.of(etag, lock);
        } catch (FileNotFoundException ignore) {
            return Pair.of(null, null);
        }
    }

    private String write(Principal principal, String path, String etag, LockInfo lock) throws IOException {
        BodyWriter writer = stream -> MAPPER.writeValue(stream, lock);
        return dialFileApi.writeFile(path + LOCK_NAME, etag, writer, CONTENT_TYPE, principal);
    }

    private void delete(String path, Principal principal, String etag) throws IOException {
        dialFileApi.deleteFile(path + LOCK_NAME, etag, principal);
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

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record LockInfo(LockType lockType, long expiry, String linkId, String linkPath) {
    }

    public interface IOConsumer {
        void accept(String path) throws IOException;
    }

    public interface IOPredicate {
        boolean test(String path) throws IOException;
    }
}
