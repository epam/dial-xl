package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
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
import java.io.IOException;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;

@ExtendWith(MockitoExtension.class)
class DialImportProviderTest {
    @Mock
    private DialFileApi dialFileApi;

    @Mock
    private DataStore dataStore;

    @Mock
    private Principal principal;

    @Test
    void testSaveSyncs() throws IOException {
        DialImportProvider provider = new DialImportProvider(dialFileApi, dataStore);
        String folder = "test/folder/";
        DialImportProvider.Syncs syncs = new DialImportProvider.Syncs();
        DialImportProvider.Sync sync = new DialImportProvider.Sync();
        sync.setSync("sync1");
        sync.setSource("source1");
        sync.setDefinition("definition1");
        sync.setVersion(1L);
        sync.setPath("test/folder/file1.csv");
        sync.setDataset("dataset1");
        DataSchema schema = new DataSchema();
        schema.addColumn(new DataSchema.Column("column1", "String", InputColumnType.STRING));
        sync.setSchema(schema);
        sync.setStartedAt(2L);
        sync.setStoppedAt(3L);
        sync.setStatus(DialImportProvider.Sync.Status.SUCCEEDED);
        syncs.setSyncs(new LinkedHashMap<>(Map.of(sync.getSync(), sync)));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> etagCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<BodyWriter> bodyWriterCaptor = ArgumentCaptor.forClass(BodyWriter.class);
        ArgumentCaptor<String> contentTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Principal> principalCaptor = ArgumentCaptor.forClass(Principal.class);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        doAnswer(invocation -> {
            bodyWriterCaptor.getValue().write(outputStream);
            return null;
        }).when(dialFileApi).writeFile(
                pathCaptor.capture(),
                etagCaptor.capture(),
                bodyWriterCaptor.capture(),
                contentTypeCaptor.capture(),
                principalCaptor.capture());
        String expectedJson = """
                {
                    "syncs": {
                        "sync1": {
                            "definition": "definition1",
                            "source": "source1",
                            "dataset": "dataset1",
                            "schema": {
                                "columns": {
                                    "column1": {
                                        "column": "column1",
                                        "type": "String",
                                        "target": "STRING"
                                    }
                                }
                            },
                            "sync": "sync1",
                            "path": "test/folder/file1.csv",
                            "status": "SUCCEEDED",
                            "startedAt": 2,
                            "stoppedAt": 3,
                            "version": 1
                        }
                    }
                }
                """.replaceAll("\\s+", "");

        provider.saveSyncs(principal, folder, syncs);

        assertThat(pathCaptor.getValue()).isEqualTo("test/folder/.import-syncs.json");
        assertThat(etagCaptor.getValue()).isEqualTo("*");
        assertThat(contentTypeCaptor.getValue()).isEqualTo("application/json");
        assertThat(principalCaptor.getValue()).isEqualTo(principal);
        assertThat(outputStream.toString()).isEqualTo(expectedJson);
    }

    @Test
    void testLoadSyncs() throws IOException {
        DialImportProvider provider = new DialImportProvider(dialFileApi, dataStore);
        String folder = "test/folder/";
        String json = """
                {
                    "syncs": {
                        "sync1": {
                            "definition": "definition1",
                            "source": "source1",
                            "dataset": "dataset1",
                            "schema": {
                                "columns": {
                                    "column1": {
                                        "column": "column1",
                                        "type": "String",
                                        "target": "STRING"
                                    }
                                }
                            },
                            "sync": "sync1",
                            "path": "test/folder/file1.csv",
                            "status": "SUCCEEDED",
                            "startedAt": 2,
                            "stoppedAt": 3,
                            "version": 1
                        }
                    }
                }
                """;
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Principal> principalCaptor = ArgumentCaptor.forClass(Principal.class);
        doReturn(new EtaggedStream(null, new ByteArrayInputStream(json.getBytes()), "etag"))
                .when(dialFileApi).readFile(pathCaptor.capture(), principalCaptor.capture());

        DialImportProvider.Syncs syncs = provider.loadSyncs(principal, folder);

        assertThat(pathCaptor.getValue()).isEqualTo("test/folder/.import-syncs.json");
        assertThat(principalCaptor.getValue()).isEqualTo(principal);

        assertThat(syncs.getSyncs()).hasSize(1);
        DialImportProvider.Sync sync = syncs.getSyncs().get("sync1");
        assertThat(sync.getDefinition()).isEqualTo("definition1");
        assertThat(sync.getSync()).isEqualTo("sync1");
        assertThat(sync.getSource()).isEqualTo("source1");
        assertThat(sync.getDataset()).isEqualTo("dataset1");
        assertThat(sync.getVersion()).isEqualTo(1L);
        assertThat(sync.getSchema().getColumns()).hasSize(1);
        DataSchema.Column column = sync.getSchema().getColumns().get("column1");
        assertThat(column.getColumn()).isEqualTo("column1");
        assertThat(column.getType()).isEqualTo("String");
        assertThat(column.getTarget()).isEqualTo(InputColumnType.STRING);
        assertThat(sync.getPath()).isEqualTo("test/folder/file1.csv");
        assertThat(sync.getStartedAt()).isEqualTo(2L);
        assertThat(sync.getStoppedAt()).isEqualTo(3L);
        assertThat(sync.getStatus()).isEqualTo(DialImportProvider.Sync.Status.SUCCEEDED);
    }
}