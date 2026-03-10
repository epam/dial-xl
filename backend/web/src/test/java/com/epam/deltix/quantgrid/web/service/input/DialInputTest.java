package com.epam.deltix.quantgrid.web.service.input;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.quantgrid.input.api.DataRow;
import com.epam.quantgrid.input.api.DataStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.Principal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DialInputTest {
    private static final Principal PRINCIPAL = () -> "user";
    private static final String BUCKET = "test-bucket";
    private static final String DATASET = "test.csv";
    private static final String INPUT = "files/test-bucket/test.csv";
    private static final InputMetadata INPUT_METADATA = new CsvInputMetadata(
            INPUT,
            "test-etag",
            new CsvInputMetadata.CsvTable(List.of(
                    new ColumnMetadata("a", 0, InputColumnType.STRING),
                    new ColumnMetadata("a1", 1, InputColumnType.STRING),
                    new ColumnMetadata("b", 2, InputColumnType.DOUBLE))));

    @Mock
    private DialFileApi dialFileApi;

    @Mock
    private DialInputProvider dialInputProvider;

    @Test
    void testGetSchema() throws Exception {
        DialInput input = new DialInput();
        input.setDial(dialFileApi);
        input.setPrincipal(PRINCIPAL);
        input.setProvider(dialInputProvider);
        DataSchema expected = new DataSchema();
        DataSchema.Column column1 = new DataSchema.Column();
        column1.setColumn("a");
        column1.setType("STRING");
        column1.setTarget(InputColumnType.STRING);
        expected.addColumn(column1);
        DataSchema.Column column2 = new DataSchema.Column();
        column2.setColumn("a1");
        column2.setType("STRING");
        column2.setTarget(InputColumnType.STRING);
        expected.addColumn(column2);
        DataSchema.Column column3 = new DataSchema.Column();
        column3.setColumn("b");
        column3.setType("DOUBLE");
        column3.setTarget(InputColumnType.DOUBLE);
        expected.addColumn(column3);

        ArgumentCaptor<Principal> getBucketPrincipal = ArgumentCaptor.captor();
        when(dialFileApi.getBucket(getBucketPrincipal.capture())).thenReturn(BUCKET);
        ArgumentCaptor<String> readMetadataInput = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readMetadataPrincipal = ArgumentCaptor.captor();
        when(dialInputProvider.readMetadata(readMetadataInput.capture(), readMetadataPrincipal.capture()))
                .thenReturn(INPUT_METADATA);

        DataSchema actual = input.getSchema(DATASET);

        assertThat(actual).isEqualTo(expected);

        assertThat(getBucketPrincipal.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readMetadataInput.getValue()).isEqualTo(INPUT);
        assertThat(readMetadataPrincipal.getValue()).isEqualTo(PRINCIPAL);
    }

    @Test
    void testGetStream() throws Exception {
        DialInput input = new DialInput();
        input.setDial(dialFileApi);
        input.setPrincipal(PRINCIPAL);
        input.setProvider(dialInputProvider);
        DataSchema schema = new DataSchema();
        DataSchema.Column column1 = new DataSchema.Column();
        column1.setColumn("a");
        column1.setTarget(InputColumnType.STRING);
        schema.addColumn(column1);
        DataSchema.Column column2 = new DataSchema.Column();
        column2.setColumn("b");
        column2.setTarget(InputColumnType.DOUBLE);
        schema.addColumn(column2);
        LocalTable table = new LocalTable(new StringDirectColumn("value1"), new DoubleDirectColumn(1.0));

        ArgumentCaptor<Principal> getBucketPrincipal = ArgumentCaptor.captor();
        when(dialFileApi.getBucket(getBucketPrincipal.capture())).thenReturn(BUCKET);
        ArgumentCaptor<String> readMetadataInput = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readMetadataPrincipal = ArgumentCaptor.captor();
        when(dialInputProvider.readMetadata(readMetadataInput.capture(), readMetadataPrincipal.capture()))
                .thenReturn(INPUT_METADATA);
        ArgumentCaptor<List<String>> readDataColumns = ArgumentCaptor.captor();
        ArgumentCaptor<InputMetadata> readDataMetadata = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readDataPrincipal = ArgumentCaptor.captor();
        when(dialInputProvider.readData(
                readDataColumns.capture(),
                readDataMetadata.capture(),
                readDataPrincipal.capture())).thenReturn(table);

        DataStream stream = input.getStream(DATASET, schema);

        DataRow row = stream.next();

        assertThat(row.getString(0)).isEqualTo("value1");
        assertThat(row.getDouble(1)).isEqualTo(1.0);
        assertThat(stream.next()).isNull();

        assertThat(getBucketPrincipal.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readMetadataInput.getValue()).isEqualTo(INPUT);
        assertThat(readMetadataPrincipal.getValue()).isEqualTo(PRINCIPAL);
        assertThat(readDataColumns.getValue()).isEqualTo(List.of("a", "b"));
        assertThat(readDataMetadata.getValue()).isEqualTo(INPUT_METADATA);
        assertThat(readDataPrincipal.getValue()).isEqualTo(PRINCIPAL);
    }
}