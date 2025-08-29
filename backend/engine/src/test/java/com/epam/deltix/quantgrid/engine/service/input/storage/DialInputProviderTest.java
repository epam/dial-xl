package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.security.DialAuth;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.Doubles;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;


class DialInputProviderTest {
    private static final String BUCKET_URL = "/v1/bucket";
    private static final String TEST_INPUT = "files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv";
    private static final String TEST_INPUT_URL = "/v1/" + TEST_INPUT;
    private static final String TEST_INPUT_META_URL = "/v1/metadata/" + TEST_INPUT + "?permissions=true";
    private static final String TEST_SCHEMA_URL = "/v1/files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/.country%20-%20data.schema";
    private static final String TEST_SCHEMA_OLD_CONTENT = """
            {"version":1,"timestamp":123,"columns":{"country":"STRING","date":"DATE","GDP":"DOUBLE","IR":"DOUBLE"},"etag":"test-etag"}""";
    private static final String TEST_SCHEMA_CONTENT = """
            {"version":1,"timestamp":123,"columns":{"country":"STRING","date":"DATE","GDP":"DOUBLE","IR":"DOUBLE"},"etag":"test-etag","error":null}""";
    private static final String TEST_INVALID_SCHEMA_CONTENT = """
            {"version":1,"timestamp":123,"columns":null,"etag":"test-etag","error":"The document doesn't have headers."}""";
    private static final String TEST_INPUT_CONTENT = """
            country,date,GDP,IR
            USA,2021-01-01,21060,
            USA,2022-01-01,23315,4.9
            China,2021-01-01,14688,0.1
            China,2022-01-01,17734,0.2
            EU,2021-01-01,13085,7
            EU,2022-01-01,,6.1
            """;
    private static final String TEST_INPUT_ETAG = "test-etag";
    private static final InputMetadata TEST_INPUT_METADATA = new InputMetadata(
            TEST_INPUT, TEST_INPUT, TEST_INPUT_ETAG, InputType.CSV, new LinkedHashMap<>() {{
                put("country", InputColumnType.STRING);
                put("date", InputColumnType.DATE);
                put("GDP", InputColumnType.DOUBLE);
                put("IR", InputColumnType.DOUBLE);
            }});
    private static final DialAuth TEST_PRINCIPAL = new DialAuth() {
        @Override
        public String getKey() {
            return "api-key";
        }

        @Override
        public String getValue() {
            return "test-api-key";
        }

        @Override
        public String getName() {
            return "dial-auth";
        }
    };

    @Test
    void testReadInput() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(TEST_INPUT_CONTENT));

            List<String> readColumns = List.of("country", "date", "GDP", "IR");
            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            LocalTable actual = inputProvider.readData(readColumns, TEST_INPUT_METADATA, TEST_PRINCIPAL);

            assertEquals(4, actual.getColumnCount());
            assertArrayEquals(new String[] {"USA", "USA", "China", "China", "EU", "EU"},
                    ((StringDirectColumn) actual.getColumn(0)).toArray());
            assertArrayEquals(new double[] {44197.0, 44562.0, 44197.0, 44562.0, 44197.0, 44562.0},
                    ((DoubleDirectColumn) actual.getColumn(1)).toArray());
            assertArrayEquals(new double[] {21060.0, 23315.0, 14688.0, 17734.0, 13085.0, Doubles.EMPTY},
                    ((DoubleDirectColumn) actual.getColumn(2)).toArray());
            assertArrayEquals(new double[] {Doubles.EMPTY, 4.9, 0.1, 0.2, 7.0, 6.1},
                    ((DoubleDirectColumn) actual.getColumn(3)).toArray());

            RecordedRequest request = server.takeRequest();
            assertEquals(TEST_INPUT_URL, request.getPath());
            assertEquals("GET", request.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), request.getHeader("api-key"));
        }
    }

    @Test
    void testReadMetadataFromCsv() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ"]
                    }
                    """));
            server.enqueue(new MockResponse().setResponseCode(404));
            server.enqueue(new MockResponse().setBody("""
                    {
                        "bucket": "4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b"
                    }
                    """));
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(TEST_INPUT_CONTENT));
            server.enqueue(new MockResponse());

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertEquals(TEST_INPUT_METADATA, inputMetadata);

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getAttributesRequest.getPath());
            assertEquals("GET", getAttributesRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getAttributesRequest.getHeader("api-key"));

            RecordedRequest getSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, getSchemaRequest.getPath());
            assertEquals("GET", getSchemaRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getSchemaRequest.getHeader("api-key"));

            RecordedRequest getBucketRequest = server.takeRequest();
            assertEquals(BUCKET_URL, getBucketRequest.getPath());
            assertEquals("GET", getBucketRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getBucketRequest.getHeader("api-key"));

            RecordedRequest getInputRequest = server.takeRequest();
            assertEquals(TEST_INPUT_URL, getInputRequest.getPath());
            assertEquals("GET", getInputRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getInputRequest.getHeader("api-key"));

            RecordedRequest putSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, putSchemaRequest.getPath());
            assertEquals("PUT", putSchemaRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), putSchemaRequest.getHeader("api-key"));
            assertTrue(putSchemaRequest.getBody().readString(StandardCharsets.UTF_8).contains(
                    TEST_SCHEMA_CONTENT.substring(TEST_SCHEMA_CONTENT.indexOf("\"columns\":"))));
            assertTrue(putSchemaRequest.getHeader("content-type").contains("multipart/form-data"));
        }
    }

    @Test
    void testReadMetadataFromSchema() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ", "WRITE"]
                    }
                    """));
            server.enqueue(new MockResponse().setBody(TEST_SCHEMA_CONTENT));

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertEquals(TEST_INPUT_METADATA, inputMetadata);

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getAttributesRequest.getPath());
            assertEquals("GET", getAttributesRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getAttributesRequest.getHeader("api-key"));

            RecordedRequest getSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, getSchemaRequest.getPath());
            assertEquals("GET", getSchemaRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getSchemaRequest.getHeader("api-key"));
        }
    }

    @Test
    void testReadMetadataFromCsvWhenSchemaIsOutdated() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ"]
                    }
                    """));
            String outdatedSchema = TEST_SCHEMA_CONTENT.replace(TEST_INPUT_ETAG, "old-etag");
            server.enqueue(new MockResponse().setBody(outdatedSchema));
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(TEST_INPUT_CONTENT));
            server.enqueue(new MockResponse());

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertEquals(TEST_INPUT_METADATA, inputMetadata);

            RecordedRequest getPermissionsRequest = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getPermissionsRequest.getPath());
            assertEquals("GET", getPermissionsRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getPermissionsRequest.getHeader("api-key"));

            RecordedRequest getSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, getSchemaRequest.getPath());
            assertEquals("GET", getSchemaRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getSchemaRequest.getHeader("api-key"));

            RecordedRequest getInputRequest = server.takeRequest();
            assertEquals(TEST_INPUT_URL, getInputRequest.getPath());
            assertEquals("GET", getInputRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getInputRequest.getHeader("api-key"));

            RecordedRequest putSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, putSchemaRequest.getPath());
            assertEquals("PUT", putSchemaRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), putSchemaRequest.getHeader("api-key"));
            assertTrue(putSchemaRequest.getBody().readString(StandardCharsets.UTF_8).contains(
                    TEST_SCHEMA_CONTENT.substring(TEST_SCHEMA_CONTENT.indexOf("\"columns\":"))));
            assertTrue(putSchemaRequest.getHeader("content-type").contains("multipart/form-data"));
        }
    }

    @Test
    void testReadMetadataWithMissingEtag() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "permissions": ["READ"]
                    }
                    """));
            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            Exception exception = assertThrows(
                    NullPointerException.class, () -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL));
            assertEquals(
                    "Missing ETag for files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv",
                    exception.getMessage());

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getAttributesRequest.getPath());
            assertEquals("GET", getAttributesRequest.getMethod());
            assertEquals(TEST_PRINCIPAL.getValue(), getAttributesRequest.getHeader("api-key"));
        }
    }

    @Test
    void testReadMetadataFromOldSchema() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ", "WRITE"]
                    }
                    """));
            server.enqueue(new MockResponse().setBody(TEST_SCHEMA_OLD_CONTENT));

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");
            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertEquals(TEST_INPUT_METADATA, inputMetadata);
        }
    }

    @Test
    void testCachingMetadataForInvalidCsv() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ"]
                    }
                    """));
            server.enqueue(new MockResponse().setResponseCode(404));
            server.enqueue(new MockResponse().setBody("""
                    {
                        "bucket": "4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b"
                    }
                    """));
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(""));
            server.enqueue(new MockResponse());

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, "test.json");

            InvalidInputException exception = Assertions.assertThrows(InvalidInputException.class,
                    () -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL));

            assertEquals(TEST_INPUT_ETAG, exception.getEtag());
            assertEquals("The document doesn't have headers.", exception.getMessage());

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getAttributesRequest.getPath());
            assertEquals("GET", getAttributesRequest.getMethod());

            RecordedRequest getSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, getSchemaRequest.getPath());
            assertEquals("GET", getSchemaRequest.getMethod());

            RecordedRequest getBucketRequest = server.takeRequest();
            assertEquals(BUCKET_URL, getBucketRequest.getPath());
            assertEquals("GET", getBucketRequest.getMethod());

            RecordedRequest getInputRequest = server.takeRequest();
            assertEquals(TEST_INPUT_URL, getInputRequest.getPath());
            assertEquals("GET", getInputRequest.getMethod());

            RecordedRequest putSchemaRequest = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, putSchemaRequest.getPath());
            assertEquals("PUT", putSchemaRequest.getMethod());
            assertTrue(putSchemaRequest.getBody().readString(StandardCharsets.UTF_8).contains(
                    TEST_INVALID_SCHEMA_CONTENT.substring(TEST_INVALID_SCHEMA_CONTENT.indexOf("\"columns\":"))));

            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ"]
                    }
                    """));
            server.enqueue(new MockResponse().setBody(TEST_INVALID_SCHEMA_CONTENT));

            InvalidInputException exception2 = Assertions.assertThrows(InvalidInputException.class,
                    () -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL));

            assertEquals(TEST_INPUT_ETAG, exception2.getEtag());
            assertEquals("The document doesn't have headers.", exception2.getMessage());

            RecordedRequest getAttributesRequest2 = server.takeRequest();
            assertEquals(TEST_INPUT_META_URL, getAttributesRequest2.getPath());
            assertEquals("GET", getAttributesRequest2.getMethod());

            RecordedRequest getSchemaRequest2 = server.takeRequest();
            assertEquals(TEST_SCHEMA_URL, getSchemaRequest2.getPath());
            assertEquals("GET", getSchemaRequest2.getMethod());

            Assertions.assertEquals(7, server.getRequestCount(), "Some requests are not asserted");
        }
    }

    private static MockWebServer startMockWebServer() throws IOException {
        MockWebServer server = new MockWebServer();
        QueueDispatcher dispatcher = new QueueDispatcher();
        dispatcher.setFailFast(true);
        server.setDispatcher(dispatcher);
        server.start();

        return server;
    }
}