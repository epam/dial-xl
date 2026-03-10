package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
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
    private static final String EXCEL_SCHEMA_JSON = """
            {"catalog":null,"entries":{""" + """
            "table=table1":{"value":{"sheet":"sheet1","startRow":1,"endRow":10,"columns":[{"name":"col1","index":0,"type":"STRING"}]},"timestamp":123},""" + """
            "table=table2":{"value":{"sheet":"sheet2","startRow":2,"endRow":11,"columns":[{"name":"col2","index":1,"type":"DOUBLE"}]},"timestamp":123}""" + """
            }}""";
    private static final String EXCEL_SCHEMA_UPDATED_JSON = """
            {"catalog":null,"entries":{""" + """
            "table=table1":{"value":{"sheet":"sheet1","startRow":1,"endRow":10,"columns":[{"name":"col1","index":0,"type":"STRING"}]},"timestamp":1800124},""" + """
            "table=table2":{"value":{"sheet":"sheet2","startRow":2,"endRow":11,"columns":[{"name":"col2","index":1,"type":"DOUBLE"}]},"timestamp":123}""" + """
            }}""";
    private static final String EXCEL_SCHEMA_CLEANED_JSON = """
            {"catalog":null,"entries":{""" + """
            "table=table1":{"value":{"sheet":"sheet1","startRow":1,"endRow":10,"columns":[{"name":"col1","index":0,"type":"STRING"}]},"timestamp":3600124}""" + """
            }}""";
    private static final String EXCEL_CATALOG_JSON = """
            {"catalog":{"value":{"sheets":["sheet1","sheet2"],"tables":["table1","table2"]},"timestamp":3600124},"entries":{}}""";
    private static final List<ColumnMetadata> COLUMNS = List.of(
            new ColumnMetadata("col1", 0, InputColumnType.STRING));
    private static final CsvInputMetadata.CsvTable CSV_SCHEMA = new CsvInputMetadata.CsvTable(COLUMNS);
    private static final ExcelTableKey EXCEL_TABLE_KEY = new ExcelTableKey.Table("table1");
    private static final ExcelInputMetadata.ExcelTable EXCEL_SCHEMA = new ExcelInputMetadata.ExcelTable("sheet1", 1, 10, COLUMNS);
    private static final ExcelCatalog EXCEL_CATALOG = new ExcelCatalog(List.of("sheet1", "sheet2"), List.of("table1", "table2"));
    private static final String METADATA_FOLDER = "testFolder/";
    private static final Duration UPDATE_AFTER = Duration.ofMinutes(30);
    private static final Duration DELETE_AFTER = Duration.ofHours(1);
    private static final String PATH = "testPath";
    private static final String FULL_PATH = "files/testUserBucket/testFolder/testPath";
    private static final String CONTENT_TYPE = "application/json";

    @Mock
    private Clock clock;

    @Mock
    private DialFileApi fileApi;

    @Test
    void testLoadCsvSchema() throws IOException {
        DialSchemaStore schemaStore =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

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
        CsvInputMetadata.CsvTable actual = schemaStore.loadCsvSchema(PATH);

        assertThat(actual).isEqualTo(CSV_SCHEMA);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testLoadAndUpdateCsvSchema() throws IOException {
        DialSchemaStore schemaStore =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

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
        CsvInputMetadata.CsvTable actual = schemaStore.loadCsvSchema(PATH);

        assertThat(actual).isEqualTo(CSV_SCHEMA);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
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
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

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
        schemaApi.storeCsvSchema(PATH, CSV_SCHEMA);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isNull();
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(CSV_SCHEMA_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testNoCleanup() throws IOException {
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        DialFileApi.Attributes attributes = new DialFileApi.Attributes(
                TEST_ETAG, PATH, "files/testUserBucket/testFolder", 123L, List.of(), null, List.of());
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
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        DialFileApi.Attributes attributes = new DialFileApi.Attributes(
                TEST_ETAG, PATH, "files/testUserBucket/testFolder", 123L, List.of(), null, List.of());
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

        assertThat(deleteFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(deleteFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        assertThat(deleteFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testLoadExcelSchema() throws IOException {
        DialSchemaStore schemaStore =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG));

        schemaStore.init();
        ExcelInputMetadata.ExcelTable actual = schemaStore.loadExcelSchema(PATH, EXCEL_TABLE_KEY);

        assertThat(actual).isEqualTo(EXCEL_SCHEMA);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testLoadAndUpdateExcelSchema() throws IOException {
        DialSchemaStore schemaStore =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124 + UPDATE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
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
        ExcelInputMetadata.ExcelTable actual = schemaStore.loadExcelSchema(PATH, EXCEL_TABLE_KEY);

        assertThat(actual).isEqualTo(EXCEL_SCHEMA);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(EXCEL_SCHEMA_UPDATED_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testStoreExcelSchemaNew() throws IOException {
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124L + DELETE_AFTER.toMillis());
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
        schemaApi.storeExcelSchema(PATH, EXCEL_TABLE_KEY, EXCEL_SCHEMA);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isNull();
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(EXCEL_SCHEMA_CLEANED_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testStoreExcelSchemaExisting() throws IOException {
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124L + UPDATE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
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

        schemaApi.init();
        schemaApi.storeExcelSchema(PATH, EXCEL_TABLE_KEY, EXCEL_SCHEMA);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(EXCEL_SCHEMA_UPDATED_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testStoreExcelSchemaExistingCleaned() throws IOException {
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124L + DELETE_AFTER.toMillis());
        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_SCHEMA_JSON.getBytes(StandardCharsets.UTF_8)),
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

        schemaApi.init();
        schemaApi.storeExcelSchema(PATH, EXCEL_TABLE_KEY, EXCEL_SCHEMA);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isEqualTo(TEST_ETAG);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(EXCEL_SCHEMA_CLEANED_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testLoadExcelCatalog() throws IOException {
        DialSchemaStore schemaStore =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        ArgumentCaptor<Principal> getBucketPrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.getBucket(getBucketPrincipalCaptor.capture()))
                .thenReturn(TEST_BUCKET);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(fileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(
                        null,
                        new ByteArrayInputStream(EXCEL_CATALOG_JSON.getBytes(StandardCharsets.UTF_8)),
                        TEST_ETAG));

        schemaStore.init();
        ExcelCatalog actual = schemaStore.loadExcelCatalog(PATH);

        assertThat(actual).isEqualTo(EXCEL_CATALOG);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testStoreExcelCatalogNew() throws IOException {
        DialSchemaStore schemaApi =
                new DialSchemaStore(clock, fileApi, PRINCIPAL, METADATA_FOLDER, UPDATE_AFTER, DELETE_AFTER);

        when(clock.millis()).thenReturn(124L + DELETE_AFTER.toMillis());
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
        schemaApi.storeExcelCatalog(PATH, EXCEL_CATALOG);

        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(writeFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(writeFileEtagCaptor.getValue()).isNull();
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        BodyWriter bodyWriter = writeFileBodyWriterCaptor.getValue();
        assertThat(bodyWriter).isNotNull();
        bodyWriter.write(stream);
        assertThat(stream.toString(StandardCharsets.UTF_8)).isEqualTo(EXCEL_CATALOG_JSON);
        assertThat(writeFileContentTypeCaptor.getValue()).isEqualTo(CONTENT_TYPE);
        assertThat(writeFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(getBucketPrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readFilePathCaptor.getValue()).isEqualTo(FULL_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(PRINCIPAL);
    }
}