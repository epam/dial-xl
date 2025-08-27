package com.epam.deltix.quantgrid.engine.store.dial;

import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ConcurrentModificationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class DialLockTest {
    private static final Duration ACCESS_LOCK_TTL = Duration.ofSeconds(5);
    private static final Duration DELETE_LOCK_TTL = Duration.ofSeconds(5);
    private static final String ENTRY_PATH = "files/testBucket/test/path/";
    private static final String LOCK_PATH = ENTRY_PATH + "lock.json";
    private static final Principal PRINCIPAL = () -> "testPrincipal";
    private static final String ETAG = "etag123";
    private static final String CONTENT_TYPE = "application/json";
    private static final String ACCESS_LOCK = """
            {"lockType":"ACCESS","expiry":10000}""";
    private static final String DELETE_LOCK_TEMPLATE = """
            {"lockType":"DELETE","expiry":%d}""";

    @Mock(answer = Answers.CALLS_REAL_METHODS)
    private Clock clock;
    @Mock
    private DialFileApi dialFileApi;
    @Mock
    private DialLock.IOPredicate predicate;
    @Mock
    private DialLock.IOConsumer onDelete;

    private DialLock dialLock;

    @BeforeEach
    void setUp() {
        dialLock = new DialLock(clock, dialFileApi, ACCESS_LOCK_TTL, DELETE_LOCK_TTL);
    }

    @Test
    void testAccessNew() throws IOException {
        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doThrow(FileNotFoundException.class).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doReturn(null).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        ArgumentCaptor<String> testPath = ArgumentCaptor.captor();
        doReturn(true).when(predicate).test(testPath.capture());
        doReturn(Instant.ofEpochSecond(5)).when(clock).instant();

        boolean actual = dialLock.access(ENTRY_PATH, predicate, PRINCIPAL);

        assertTrue(actual);
        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertNull(writeFileEtag.getValue());
        assertEquals(ACCESS_LOCK, getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, testPath.getValue());
    }

    @Test
    void testAccessNoDataFile() throws IOException {
        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doThrow(FileNotFoundException.class).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> testPath = ArgumentCaptor.captor();
        doReturn(false).when(predicate).test(testPath.capture());

        boolean actual = dialLock.access(ENTRY_PATH, predicate, PRINCIPAL);

        assertFalse(actual);
        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, testPath.getValue());
    }

    @Test
    void testAccessExisting() throws IOException {
        EtaggedStream contentStream = new EtaggedStream(null, new ByteArrayInputStream(ACCESS_LOCK.getBytes()), ETAG);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doReturn(null).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        ArgumentCaptor<String> testPath = ArgumentCaptor.captor();
        doReturn(true).when(predicate).test(testPath.capture());
        doReturn(Instant.ofEpochSecond(5)).when(clock).instant();

        boolean actual = dialLock.access(ENTRY_PATH, predicate, PRINCIPAL);

        assertTrue(actual);
        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertEquals(ETAG, writeFileEtag.getValue());
        assertEquals(ACCESS_LOCK, getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, testPath.getValue());
    }

    @Test
    void testAccessDelete() throws IOException {
        EtaggedStream contentStream = new EtaggedStream(
                null, new ByteArrayInputStream(DELETE_LOCK_TEMPLATE.formatted(0).getBytes()), ETAG);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        doReturn(Instant.ofEpochSecond(0)).when(clock).instant();

        boolean actual = dialLock.access(ENTRY_PATH, predicate, PRINCIPAL);

        assertFalse(actual);
        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
    }

    @Test
    void testAccessExpiredDelete() throws IOException {
        EtaggedStream contentStream = new EtaggedStream(
                null, new ByteArrayInputStream(DELETE_LOCK_TEMPLATE.formatted(4).getBytes()), ETAG);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doReturn(null).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        ArgumentCaptor<String> testPath = ArgumentCaptor.captor();
        doReturn(true).when(predicate).test(testPath.capture());
        doReturn(Instant.ofEpochSecond(5)).when(clock).instant();

        boolean actual = dialLock.access(ENTRY_PATH, predicate, PRINCIPAL);

        assertTrue(actual);
        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertEquals(ETAG, writeFileEtag.getValue());
        assertEquals(ACCESS_LOCK, getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, testPath.getValue());
    }

    @Test
    void testDeleteAfterExpiredLock() throws IOException {
        Duration deleteAfter = Duration.ofSeconds(5);
        EtaggedStream contentStream = new EtaggedStream(null, new ByteArrayInputStream(ACCESS_LOCK.getBytes()), ETAG);
        String newEtag = "newEtag123";

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doReturn(newEtag).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        ArgumentCaptor<String> deleteFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> deleteFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> deleteFilePrincipal = ArgumentCaptor.captor();
        doNothing().when(dialFileApi).deleteFile(
                deleteFilePath.capture(), deleteFileEtag.capture(), deleteFilePrincipal.capture());
        ArgumentCaptor<String> acceptPath = ArgumentCaptor.captor();
        doNothing().when(onDelete).accept(acceptPath.capture());
        doReturn(Instant.ofEpochSecond(16)).when(clock).instant();

        dialLock.deleteAfter(ENTRY_PATH, deleteAfter, onDelete, PRINCIPAL);

        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertEquals(ETAG, writeFileEtag.getValue());
        assertEquals(DELETE_LOCK_TEMPLATE.formatted(21000), getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
        assertEquals(LOCK_PATH, deleteFilePath.getValue());
        assertEquals(newEtag, deleteFileEtag.getValue());
        assertEquals(PRINCIPAL, deleteFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, acceptPath.getValue());
    }

    @Test
    void testDeleteAfterUnexpiredLock() throws IOException {
        Duration deleteAfter = Duration.ofSeconds(5);
        EtaggedStream contentStream = new EtaggedStream(null, new ByteArrayInputStream(ACCESS_LOCK.getBytes()), ETAG);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());
        doReturn(Instant.ofEpochSecond(15)).when(clock).instant();

        dialLock.deleteAfter(ENTRY_PATH, deleteAfter, onDelete, PRINCIPAL);

        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
    }

    @Test
    void testDeleteAfterNew() throws IOException {
        Duration deleteAfter = Duration.ofSeconds(5);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doThrow(FileNotFoundException.class).when(dialFileApi).readFile(
                readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doReturn(ETAG).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        ArgumentCaptor<String> deleteFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> deleteFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> deleteFilePrincipal = ArgumentCaptor.captor();
        doNothing().when(dialFileApi).deleteFile(
                deleteFilePath.capture(), deleteFileEtag.capture(), deleteFilePrincipal.capture());
        ArgumentCaptor<String> acceptPath = ArgumentCaptor.captor();
        doNothing().when(onDelete).accept(acceptPath.capture());
        doReturn(Instant.ofEpochSecond(16)).when(clock).instant();

        dialLock.deleteAfter(ENTRY_PATH, deleteAfter, onDelete, PRINCIPAL);

        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertNull(writeFileEtag.getValue());
        assertEquals(DELETE_LOCK_TEMPLATE.formatted(21000), getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
        assertEquals(LOCK_PATH, deleteFilePath.getValue());
        assertEquals(ETAG, deleteFileEtag.getValue());
        assertEquals(PRINCIPAL, deleteFilePrincipal.getValue());
        assertEquals(ENTRY_PATH, acceptPath.getValue());
    }

    @Test
    void testDeleteAfterRace() throws IOException {
        Duration deleteAfter = Duration.ofSeconds(5);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doThrow(FileNotFoundException.class).when(dialFileApi).readFile(
                readFilePath.capture(), readFilePrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        doThrow(ConcurrentModificationException.class).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileBodyWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());
        doReturn(Instant.ofEpochSecond(16)).when(clock).instant();

        dialLock.deleteAfter(ENTRY_PATH, deleteAfter, onDelete, PRINCIPAL);

        assertEquals(LOCK_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
        assertEquals(LOCK_PATH, writeFilePath.getValue());
        assertNull(writeFileEtag.getValue());
        assertEquals(DELETE_LOCK_TEMPLATE.formatted(21000), getLock(writeFileBodyWriter.getValue()));
        assertEquals(CONTENT_TYPE, writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());
    }

    private static String getLock(BodyWriter writer) throws IOException {
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        writer.write(stream);
        return stream.toString();
    }
}