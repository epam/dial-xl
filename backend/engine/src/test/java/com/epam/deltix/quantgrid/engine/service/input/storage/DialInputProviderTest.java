package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialSchemaStore;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvTable;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.security.DialAuth;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.ParserException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class DialInputProviderTest {
    private static final String TEST_INPUT = "files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv";
    private static final String TEST_SCHEMA_PATH = "5518ff5b/131ef513/abbf8ead/e495067e/e606b20a/0db07a51/a55d4d56/f723b942.csv.json";
    private static final String TEST_INPUT_URL = "/v1/" + TEST_INPUT;
    private static final String TEST_INPUT_META_URL = "/v1/metadata/" + TEST_INPUT + "?permissions=true";
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
    private static final CsvInputMetadata TEST_INPUT_METADATA = new CsvInputMetadata(
            TEST_INPUT, TEST_INPUT_ETAG, List.of(
                    new CsvColumn("country", 0, InputColumnType.STRING),
                    new CsvColumn("date", 1, InputColumnType.DATE),
                    new CsvColumn("GDP", 2, InputColumnType.DOUBLE),
                    new CsvColumn("IR", 3, InputColumnType.DOUBLE)));
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

    @Mock
    private DialSchemaStore schemaStore;

    @Test
    void testReadInput() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(TEST_INPUT_CONTENT));

            List<String> readColumns = List.of("country", "date", "GDP", "IR");
            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

            LocalTable actual = inputProvider.readData(readColumns, TEST_INPUT_METADATA, TEST_PRINCIPAL);

            assertThat(actual.getColumnCount()).isEqualTo(4);
            assertThat(((StringDirectColumn) actual.getColumn(0)).toArray())
                    .isEqualTo(new String[] {"USA", "USA", "China", "China", "EU", "EU"});
            assertThat(((DoubleDirectColumn) actual.getColumn(1)).toArray())
                    .isEqualTo(new double[] {44197.0, 44562.0, 44197.0, 44562.0, 44197.0, 44562.0});
            assertThat(((DoubleDirectColumn) actual.getColumn(2)).toArray())
                    .isEqualTo(new double[] {21060.0, 23315.0, 14688.0, 17734.0, 13085.0, Doubles.EMPTY});
            assertThat(((DoubleDirectColumn) actual.getColumn(3)).toArray())
                    .isEqualTo(new double[] {Doubles.EMPTY, 4.9, 0.1, 0.2, 7.0, 6.1});

            RecordedRequest request = server.takeRequest();
            assertThat(request.getPath()).isEqualTo(TEST_INPUT_URL);
            assertThat(request.getMethod()).isEqualTo("GET");
            assertThat(request.getHeader("api-key")).isEqualTo(TEST_PRINCIPAL.getValue());
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
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(TEST_INPUT_CONTENT));

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
            CsvTable schema = new CsvTable(TEST_INPUT_METADATA.columns());
            ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
            when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture())).thenReturn(null);

            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertThat(inputMetadata).isEqualTo(TEST_INPUT_METADATA);

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertThat(getAttributesRequest.getPath()).isEqualTo(TEST_INPUT_META_URL);
            assertThat(getAttributesRequest.getMethod()).isEqualTo("GET");
            assertThat(getAttributesRequest.getHeader("api-key")).isEqualTo(TEST_PRINCIPAL.getValue());

            RecordedRequest getInputRequest = server.takeRequest();
            assertThat(getInputRequest.getPath()).isEqualTo(TEST_INPUT_URL);
            assertThat(getInputRequest.getMethod()).isEqualTo("GET");
            assertThat(getInputRequest.getHeader("api-key")).isEqualTo(TEST_PRINCIPAL.getValue());

            ArgumentCaptor<String> storeSchemaPathCaptor = ArgumentCaptor.captor();
            ArgumentCaptor<CsvTable> storeSchemaSchemaCaptor = ArgumentCaptor.captor();
            verify(schemaStore).storeCsvSchema(storeSchemaPathCaptor.capture(), storeSchemaSchemaCaptor.capture());
            assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_SCHEMA_PATH);
            assertThat(storeSchemaPathCaptor.getValue()).isEqualTo(TEST_SCHEMA_PATH);
            assertThat(storeSchemaSchemaCaptor.getValue()).isEqualTo(schema);
        }
    }

    @Test
    void testReadMetadataFromSchemaFile() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi dialFileApi = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ", "WRITE"]
                    }
                    """));

            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
            ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
            when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture()))
                    .thenReturn(new CsvTable(TEST_INPUT_METADATA.columns()));

            InputMetadata inputMetadata = inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL);

            assertThat(inputMetadata).isEqualTo(TEST_INPUT_METADATA);

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertThat(getAttributesRequest.getPath()).isEqualTo(TEST_INPUT_META_URL);
            assertThat(getAttributesRequest.getMethod()).isEqualTo("GET");
            assertThat(getAttributesRequest.getHeader("api-key")).isEqualTo(TEST_PRINCIPAL.getValue());
            assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_SCHEMA_PATH);
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
            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

            assertThatExceptionOfType(NullPointerException.class)
                    .isThrownBy(() -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL))
                    .withMessage("Missing ETag for files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv");

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertThat(getAttributesRequest.getPath()).isEqualTo(TEST_INPUT_META_URL);
            assertThat(getAttributesRequest.getMethod()).isEqualTo("GET");
            assertThat(getAttributesRequest.getHeader("api-key")).isEqualTo(TEST_PRINCIPAL.getValue());
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
            server.enqueue(new MockResponse().setHeader("ETag", TEST_INPUT_ETAG).setBody(""));
            server.enqueue(new MockResponse().setBody("""
                    {
                        "etag": "test-etag",
                        "permissions": ["READ"]
                    }
                    """));

            ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
            when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture()))
                    .thenReturn(null)
                    .thenThrow(new ParserException("The document doesn't have headers."));
            DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

            assertThatExceptionOfType(ParserException.class)
                    .isThrownBy(() -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL))
                    .withMessage("The document doesn't have headers.");

            RecordedRequest getAttributesRequest = server.takeRequest();
            assertThat(getAttributesRequest.getPath()).isEqualTo(TEST_INPUT_META_URL);
            assertThat(getAttributesRequest.getMethod()).isEqualTo("GET");

            RecordedRequest getInputRequest = server.takeRequest();
            assertThat(getInputRequest.getPath()).isEqualTo(TEST_INPUT_URL);
            assertThat(getInputRequest.getMethod()).isEqualTo("GET");

            ArgumentCaptor<String> storeSchemaPathCaptor = ArgumentCaptor.captor();
            ArgumentCaptor<String> storeSchemaErrorCaptor = ArgumentCaptor.captor();
            verify(schemaStore).storeCsvError(storeSchemaPathCaptor.capture(), storeSchemaErrorCaptor.capture());
            assertThat(storeSchemaPathCaptor.getValue()).isEqualTo(TEST_SCHEMA_PATH);
            assertThat(storeSchemaErrorCaptor.getValue()).isEqualTo("The document doesn't have headers.");

            assertThatExceptionOfType(ParserException.class)
                    .isThrownBy(() -> inputProvider.readMetadata(TEST_INPUT, TEST_PRINCIPAL))
                    .withMessage("The document doesn't have headers.");

            RecordedRequest getAttributesRequest2 = server.takeRequest();
            assertThat(getAttributesRequest2.getPath()).isEqualTo(TEST_INPUT_META_URL);
            assertThat(getAttributesRequest2.getMethod()).isEqualTo("GET");

            assertThat(server.getRequestCount()).isEqualTo(3);
            assertThat(loadSchemaPathCaptor.getAllValues()).isEqualTo(List.of(TEST_SCHEMA_PATH, TEST_SCHEMA_PATH));
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