package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvTable;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class DialSchemaStoreTest {
    private static final Principal PRINCIPAL = () -> "testUser";
    private static final String TEST_BUCKET = "testUserBucket";
    private static final String TEST_ETAG = "testEtag";
    private static final String CSV_SCHEMA_JSON = """
            {"entry":{"value":{"columns":[{"name":"col1","index":0,"type":"STRING"}]},"timestamp":123}}""";
    private static final String CSV_SCHEMA_UPDATED_JSON = """
            {"entry":{"value":{"columns":[{"name":"col1","index":0,"type":"STRING"}]},"timestamp":1800124}}""";
    private static final CsvTable CSV_TABLE = new CsvTable(List.of(new CsvColumn("col1", 0, InputColumnType.STRING)));
    private static final String METADATA_FOLDER = "testFolder/";
    private static final Duration UPDATE_AFTER = Duration.ofMinutes(30);
    private static final Duration DELETE_AFTER = Duration.ofHours(1);
    private static final String SCHEMA_PATH = "files/testUserBucket/testFolder/testPath";
    private static final String CONTENT_TYPE = "application/json";

    @Mock
    private Clock clock;

    @Mock
    private DialFileApi fileApi;

    @Test
    void testLoadCsvSchema() throws IOException {
        DialSchemaStore schemaStore = new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(CSV_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG));

        schemaStore.init();
        CsvTable actual = schemaStore.loadCsvSchema("testPath");

        assertThat(actual).isEqualTo(CSV_TABLE);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testLoadAndUpdateCsvSchema() throws IOException {
        DialSchemaStore schemaStore = new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124 + UPDATE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(CSV_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(CSV_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG));
        ArgumentCaptor<String> writeFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtagCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriterCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentTypeCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.writeFile(
                writeFilePathCaptor.capture(),
                writeFileEtagCaptor.capture(),
                writeFileBodyWriterCaptor.capture(),
                writeFileContentTypeCaptor.capture(),
                writeFilePrincipalCaptor.capture()))
                .thenReturn(TEST_ETAG);

        schemaStore.init();
        CsvTable actual = schemaStore.loadCsvSchema("testPath");

        assertThat(actual).isEqualTo(CSV_TABLE);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(CSV_SCHEMA_UPDATED_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testStoreCsvSchema() throws IOException {
        DialSchemaStore schemaApi = new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(123L);
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenThrow(new FileNotFoundException("File not found"));
        ArgumentCaptor<String> writeFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileEtagCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<BodyWriter> writeFileBodyWriterCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> writeFileContentTypeCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> writeFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.writeFile(
                writeFilePathCaptor.capture(),
                writeFileEtagCaptor.capture(),
                writeFileBodyWriterCaptor.capture(),
                writeFileContentTypeCaptor.capture(),
                writeFilePrincipalCaptor.capture()))
                .thenReturn(TEST_ETAG);

        schemaApi.init();
        schemaApi.storeCsvSchema("testPath", CSV_TABLE);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isNull();
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(CSV_SCHEMA_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testNoCleanup() throws IOException {
        DialSchemaStore schemaApi = new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        DialFileApi.Attributes attributes = new DialFileApi.Attributes(
                TEST_ETAG, "testPath", "files/testUserBucket/testFolder", 123L, List.of(), null, List.of());
        when(clock.millis()).thenReturn(123 + DELETE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> listAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> listAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.listAttributes(listAttributesPathCaptor.capture(), listAttributesPrincipalCaptor.capture()))
                .thenReturn(List.of(attributes));

        schemaApi.init();
        schemaApi.cleanup();

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(listAttributesPathCaptor.getValue()).isEqualTo("files/" + TEST_BUCKET + "/testFolder/");
        assertThat(listAttributesPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        verify(fileApi, never()).deleteFile(any(), any(), any());
    }

    @Test
    void testCleanup() throws IOException {
        DialSchemaStore schemaApi = new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        DialFileApi.Attributes attributes = new DialFileApi.Attributes(
                TEST_ETAG, "testPath", "files/testUserBucket/testFolder", 123L, List.of(), null, List.of());
        when(clock.millis()).thenReturn(124 + DELETE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> listAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> listAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.listAttributes(listAttributesPathCaptor.capture(), listAttributesPrincipalCaptor.capture()))
                .thenReturn(List.of(attributes));

        schemaApi.init();
        schemaApi.cleanup();

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(listAttributesPathCaptor.getValue()).isEqualTo("files/" + TEST_BUCKET + "/testFolder/");
        assertThat(listAttributesPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        ArgumentCaptor<String> deleteFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> deleteFileEtagCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> deleteFilePrincipalCaptor = ArgumentCaptor.captor();
        verify(fileApi).deleteFile(
                deleteFilePathCaptor.capture(),
                deleteFileEtagCaptor.capture(),
                deleteFilePrincipalCaptor.capture());

        assertThat(deleteFilePathCaptor.getValue()).isEqualTo(SCHEMA_PATH);
        assertThat(deleteFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        assertThat(deleteFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }
}