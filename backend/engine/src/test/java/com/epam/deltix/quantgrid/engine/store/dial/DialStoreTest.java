package com.epam.deltix.quantgrid.engine.store.dial;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
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
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;

@ExtendWith(MockitoExtension.class)
class DialStoreTest {
    private static final Identity ID = new Identity("testId", true);
    private static final Principal PRINCIPAL = () -> "testPrincipal";
    private static final String BUCKET = "testBucket";
    private static final String RESULTS_PATH = "test/path";
    private static final Duration REFRESH_INTERVAL = Duration.ofSeconds(123);
    private static final Duration DELETE_AFTER = Duration.ofSeconds(234);
    private static final String ENTRY_PATH = "files/testBucket/test/path/testId/";
    private static final String DATA_PATH = ENTRY_PATH + "data.csv";
    private static final String DATA = """
            4607182418800017408
            4611686018427387904
            4613937818241073152
            4616189618054758400
            4617315517961601024
            """;
    private static final double[] ARRAY = new double[] {1, 2, 3, 4, 5};

    @Mock(answer = Answers.CALLS_REAL_METHODS)
    private Clock clock;
    @Mock
    private DialFileApi dialFileApi;
    @Mock
    private DialLock dialLock;

    private DialStore dialStore;

    @BeforeEach
    void setUp() throws IOException {
        dialStore = new DialStore(
                clock, dialFileApi, dialLock, PRINCIPAL, RESULTS_PATH, REFRESH_INTERVAL, DELETE_AFTER);

        ArgumentCaptor<Principal> getBucketPrincipal = ArgumentCaptor.captor();
        doReturn(BUCKET).when(dialFileApi).getBucket(getBucketPrincipal.capture());

        dialStore.init();

        assertEquals(PRINCIPAL, getBucketPrincipal.getValue());
    }

    @Test
    void testLoad() throws IOException {
        Meta meta = new Meta(Schema.of(ColumnType.DOUBLE));
        EtaggedStream contentStream = new EtaggedStream(null, new ByteArrayInputStream(DATA.getBytes()), null);

        ArgumentCaptor<String> readFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipal = ArgumentCaptor.captor();
        doReturn(contentStream).when(dialFileApi).readFile(readFilePath.capture(), readFilePrincipal.capture());

        Table table = dialStore.load(ID, meta);

        assertEquals(1, table.getColumnCount());
        assertArrayEquals(ARRAY, assertInstanceOf(DoubleColumn.class, table.getColumn(0)).toArray());
        assertEquals(DATA_PATH, readFilePath.getValue());
        assertEquals(PRINCIPAL, readFilePrincipal.getValue());
    }

    @Test
    void testSave() throws IOException {
        Table table = new LocalTable(new DoubleDirectColumn(ARRAY));

        ArgumentCaptor<String> accessPath = ArgumentCaptor.captor();
        ArgumentCaptor<DialLock.IOPredicate> accessPredicate = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> accessPrincipal = ArgumentCaptor.captor();
        doReturn(true).when(dialLock).access(
                accessPath.capture(), accessPredicate.capture(), accessPrincipal.capture());
        ArgumentCaptor<String> writeFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileWriter = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentType = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipal = ArgumentCaptor.captor();
        doReturn(null).when(dialFileApi).writeFile(
                writeFilePath.capture(),
                writeFileEtag.capture(),
                writeFileWriter.capture(),
                writeFileContentType.capture(),
                writeFilePrincipal.capture());

        dialStore.save(ID, table);

        assertEquals(ENTRY_PATH, accessPath.getValue());
        assertEquals(PRINCIPAL, accessPrincipal.getValue());
        assertEquals(DATA_PATH, writeFilePath.getValue());
        assertNull(writeFileEtag.getValue());
        assertEquals(DATA, getData(writeFileWriter.getValue()));
        assertEquals("text/csv", writeFileContentType.getValue());
        assertEquals(PRINCIPAL, writeFilePrincipal.getValue());

        DialLock.IOPredicate predicate = accessPredicate.getValue();
        assertTrue(predicate.test(ENTRY_PATH));
    }

    @Test
    void testLock() throws IOException {
        ArgumentCaptor<String> accessPath = ArgumentCaptor.captor();
        ArgumentCaptor<DialLock.IOPredicate> accessPredicate = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> accessPrincipal = ArgumentCaptor.captor();
        doReturn(true).when(dialLock).access(
                accessPath.capture(), accessPredicate.capture(), accessPrincipal.capture());
        ArgumentCaptor<String> existsPath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> existsPrincipal = ArgumentCaptor.captor();
        doReturn(true).when(dialFileApi).exists(existsPath.capture(), existsPrincipal.capture());
        doReturn(Instant.ofEpochSecond(0)).when(clock).instant();

        boolean actual = dialStore.lock(ID);

        assertTrue(actual);
        assertEquals(List.of(ENTRY_PATH), accessPath.getAllValues());
        assertEquals(List.of(PRINCIPAL), accessPrincipal.getAllValues());
        assertEquals(Set.of(ID), dialStore.locks());

        DialLock.IOPredicate predicate = accessPredicate.getValue();
        assertTrue(predicate.test(ENTRY_PATH));
        assertEquals(DATA_PATH, existsPath.getValue());
        assertEquals(PRINCIPAL, existsPrincipal.getValue());

        dialStore.refreshLocks();
        assertEquals(List.of(ENTRY_PATH), accessPath.getAllValues());
        assertEquals(List.of(PRINCIPAL), accessPrincipal.getAllValues());

        doReturn(Instant.ofEpochSecond(REFRESH_INTERVAL.getSeconds())).when(clock).instant();
        dialStore.refreshLocks();
        assertEquals(List.of(ENTRY_PATH, ENTRY_PATH), accessPath.getAllValues());
        assertEquals(List.of(PRINCIPAL, PRINCIPAL), accessPrincipal.getAllValues());
    }

    @Test
    void testLockCantAccess() throws IOException {
        ArgumentCaptor<String> accessPath = ArgumentCaptor.captor();
        ArgumentCaptor<DialLock.IOPredicate> accessPredicate = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> accessPrincipal = ArgumentCaptor.captor();
        doReturn(false).when(dialLock).access(
                accessPath.capture(), accessPredicate.capture(), accessPrincipal.capture());

        boolean actual = dialStore.lock(ID);

        assertFalse(actual);
        assertEquals(ENTRY_PATH, accessPath.getValue());
        assertEquals(PRINCIPAL, accessPrincipal.getValue());
        assertTrue(dialStore.locks().isEmpty());
    }

    @Test
    void testUnlock() {
        dialStore.unlock(ID);

        assertTrue(dialStore.locks().isEmpty());
    }

    @Test
    void testCleanup() throws IOException {
        List<DialFileApi.Attributes> attributes = List.of(
                new DialFileApi.Attributes(null, "lock.json", "parent1", 0L, List.of(), null, List.of()),
                new DialFileApi.Attributes(null, "data.csv", "parent2", 1L, List.of(), null, List.of()),
                new DialFileApi.Attributes(null, "lock.json", "parent2", 0L, List.of(), null, List.of()),
                new DialFileApi.Attributes(null, "data.csv", "parent3", 5000L, List.of(), null, List.of()),
                new DialFileApi.Attributes(null, "data.csv", "parent4", 0L, List.of(), null, List.of()),
                new DialFileApi.Attributes(null, "lock.json", "parent4", 1L, List.of(), null, List.of()));

        ArgumentCaptor<String> deleteAfterPath = ArgumentCaptor.captor();
        ArgumentCaptor<Duration> deleteAfterDuration = ArgumentCaptor.captor();
        ArgumentCaptor<DialLock.IOConsumer> deleteAfterOnDelete = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> deleteAfterPrincipal = ArgumentCaptor.captor();
        doNothing().when(dialLock).deleteAfter(
                deleteAfterPath.capture(),
                deleteAfterDuration.capture(),
                deleteAfterOnDelete.capture(),
                deleteAfterPrincipal.capture());
        ArgumentCaptor<String> listAttributesPath = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> listAttributesPrincipal = ArgumentCaptor.captor();
        doReturn(attributes).when(dialFileApi).listAttributes(
                listAttributesPath.capture(), listAttributesPrincipal.capture());
        ArgumentCaptor<String> deleteFilePath = ArgumentCaptor.captor();
        ArgumentCaptor<String> deleteFileEtag = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> deleteFilePrincipal = ArgumentCaptor.captor();
        doNothing().when(dialFileApi).deleteFile(
                deleteFilePath.capture(), deleteFileEtag.capture(), deleteFilePrincipal.capture());
        doReturn(Instant.ofEpochSecond(235)).when(clock).instant();

        dialStore.cleanup();

        assertEquals(List.of(
                "files/testBucket/parent1/",
                "files/testBucket/parent2/",
                "files/testBucket/parent4/"), deleteAfterPath.getAllValues());
        assertEquals(List.of(DELETE_AFTER, DELETE_AFTER, DELETE_AFTER), deleteAfterDuration.getAllValues());
        assertEquals(List.of(PRINCIPAL, PRINCIPAL, PRINCIPAL), deleteAfterPrincipal.getAllValues());
        assertEquals(3, deleteAfterOnDelete.getAllValues().size());

        DialLock.IOConsumer onDelete = deleteAfterOnDelete.getValue();
        onDelete.accept("files/testBucket/test/path/parent1/");

        assertEquals("files/testBucket/test/path/parent1/data.csv", deleteFilePath.getValue());
        assertEquals("*", deleteFileEtag.getValue());
        assertEquals(PRINCIPAL, deleteFilePrincipal.getValue());
    }

    private static String getData(BodyWriter writer) throws IOException {
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        writer.write(stream);
        return stream.toString().replace("\r\n", "\n");
    }
}