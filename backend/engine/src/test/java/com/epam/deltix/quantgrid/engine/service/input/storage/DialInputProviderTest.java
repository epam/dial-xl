package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCell;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialSchemaStore;
import com.epam.deltix.quantgrid.engine.test.Utils;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.security.DialAuth;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.util.ParserException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.InputStream;
import java.security.Principal;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class DialInputProviderTest {
    private static final String TEST_CSV_INPUT =
            "files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv";
    private static final String TEST_EXCEL_INPUT_PATH =
            "files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.xlsx";
    private static final String TEST_EXCEL_INPUT = TEST_EXCEL_INPUT_PATH + "?table=table1";
    private static final String TEST_CSV_SCHEMA_PATH =
            "5518ff5b/131ef513/abbf8ead/e495067e/e606b20a/0db07a51/a55d4d56/f723b942.csv.json";
    private static final String TEST_EXCEL_SCHEMA_PATH =
            "72bd000e/bdb2735b/171d50b2/a09118b6/c5628d46/5e3ca7d3/d6fb4f24/2d9cc402.xlsx.json";
    private static final String TEST_CSV_INPUT_RESOURCE = "inputs/country - data.csv";
    private static final String TEST_EXCEL_INPUT_RESOURCE = "inputs/country - data.xlsx";
    private static final String TEST_INPUT_ETAG = "test-etag";
    private static final List<ColumnMetadata> TEST_COLUMNS = List.of(
            new ColumnMetadata("country", 0, InputColumnType.STRING),
            new ColumnMetadata("date", 1, InputColumnType.DATE),
            new ColumnMetadata("GDP", 2, InputColumnType.DOUBLE),
            new ColumnMetadata("IR", 3, InputColumnType.DOUBLE));
    private static final CsvInputMetadata TEST_CSV_INPUT_METADATA = new CsvInputMetadata(
            TEST_CSV_INPUT, TEST_INPUT_ETAG, new CsvInputMetadata.CsvTable(TEST_COLUMNS));
    private static final ExcelTableKey.Table TEST_EXCEL_TABLE_KEY = new ExcelTableKey.Table("table1");
    private static final ExcelInputMetadata TEST_EXCEL_INPUT_METADATA = new ExcelInputMetadata(
            TEST_EXCEL_INPUT_PATH, TEST_INPUT_ETAG, TEST_EXCEL_TABLE_KEY, new ExcelInputMetadata.ExcelTable(
            "sheet 1",
            1,
            7,
            TEST_COLUMNS));
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
    private static final LocalTable TEST_DATA = new LocalTable(
            new StringDirectColumn("USA", "USA", "China", "China", "EU", "EU"),
            new DoubleDirectColumn(44197.0, 44562.0, 44197.0, 44562.0, 44197.0, 44562.0),
            new DoubleDirectColumn(21060.0, 23315.0, 14688.0, 17734.0, 13085.0, Doubles.EMPTY),
            new DoubleDirectColumn(Doubles.EMPTY, 4.9, 0.1, 0.2, 7.0, 6.1));
    private static final ExcelCatalog TEST_CATALOG = new ExcelCatalog(List.of("sheet 1"), List.of("table1"));
    private static final DialFileApi.Attributes TEST_ATTRIBUTES = new DialFileApi.Attributes(
            TEST_INPUT_ETAG,
            null,
            null,
            null,
            List.of("READ"),
            null,
            List.of());

    @Mock
    private DialFileApi dialFileApi;

    @Mock
    private DialSchemaStore schemaStore;

    @Test
    void testReadCsvInput() throws Exception {
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_CSV_INPUT_RESOURCE));

        List<String> readColumns = List.of("country", "date", "GDP", "IR");
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        LocalTable actual = inputProvider.readData(readColumns, TEST_CSV_INPUT_METADATA, TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);

        assertThat(actual)
                .usingComparatorForType(Comparator.comparingLong(Double::doubleToRawLongBits), Double.class)
                .usingRecursiveComparison()
                .isEqualTo(TEST_DATA);
    }

    @Test
    void testReadExcelInput() throws Exception {
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_EXCEL_INPUT_RESOURCE));

        List<String> readColumns = List.of("country", "date", "GDP", "IR");
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        LocalTable actual = inputProvider.readData(readColumns, TEST_EXCEL_INPUT_METADATA, TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(actual)
                .usingComparatorForType(Comparator.comparingLong(Double::doubleToRawLongBits), Double.class)
                .usingRecursiveComparison()
                .isEqualTo(TEST_DATA);
    }

    @Test
    void testReadMetadataFromCsv() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);

        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_CSV_INPUT_RESOURCE));

        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
        ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture())).thenReturn(null);

        InputMetadata actual = inputProvider.readMetadata(TEST_CSV_INPUT, TEST_PRINCIPAL);

        assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        ArgumentCaptor<String> storeSchemaPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<CsvInputMetadata.CsvTable> storeSchemaSchemaCaptor = ArgumentCaptor.captor();
        verify(schemaStore).storeCsvSchema(storeSchemaPathCaptor.capture(), storeSchemaSchemaCaptor.capture());
        assertThat(storeSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);
        assertThat(storeSchemaSchemaCaptor.getValue()).isEqualTo(TEST_CSV_INPUT_METADATA.table());

        assertThat(actual).isEqualTo(TEST_CSV_INPUT_METADATA);
    }

    @Test
    void testReadMetadataFromSchemaFile() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);

        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
        ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture()))
                .thenReturn(TEST_CSV_INPUT_METADATA.table());

        InputMetadata actual = inputProvider.readMetadata(TEST_CSV_INPUT, TEST_PRINCIPAL);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);

        assertThat(actual).isEqualTo(TEST_CSV_INPUT_METADATA);
    }

    @Test
    void testReadMetadataFromExcel() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);
        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_EXCEL_INPUT_RESOURCE));

        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
        ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<ExcelTableKey> excelTableKeyCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadExcelSchema(loadSchemaPathCaptor.capture(), excelTableKeyCaptor.capture()))
                .thenReturn(null);

        InputMetadata actual = inputProvider.readMetadata(TEST_EXCEL_INPUT, TEST_PRINCIPAL);

        assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_EXCEL_SCHEMA_PATH);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        ArgumentCaptor<String> storeSchemaPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<ExcelTableKey> storeSchemaTableKeyCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<ExcelInputMetadata.ExcelTable> storeSchemaSchemaCaptor = ArgumentCaptor.captor();
        verify(schemaStore).storeExcelSchema(
                storeSchemaPathCaptor.capture(),
                storeSchemaTableKeyCaptor.capture(),
                storeSchemaSchemaCaptor.capture());
        assertThat(excelTableKeyCaptor.getValue()).isEqualTo(TEST_EXCEL_TABLE_KEY);
        assertThat(storeSchemaPathCaptor.getValue()).isEqualTo(TEST_EXCEL_SCHEMA_PATH);
        assertThat(storeSchemaSchemaCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_METADATA.table());

        assertThat(actual).isEqualTo(TEST_EXCEL_INPUT_METADATA);
    }

    @Test
    void testReadMetadataFromExcelSchemaFile() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);

        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
        ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<ExcelTableKey> loadSchemaTableKeyCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadExcelSchema(loadSchemaPathCaptor.capture(), loadSchemaTableKeyCaptor.capture()))
                .thenReturn(TEST_EXCEL_INPUT_METADATA.table());

        InputMetadata actual = inputProvider.readMetadata(TEST_EXCEL_INPUT, TEST_PRINCIPAL);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(loadSchemaTableKeyCaptor.getValue()).isEqualTo(TEST_EXCEL_TABLE_KEY);

        assertThat(actual).isEqualTo(TEST_EXCEL_INPUT_METADATA);
    }

    @Test
    void testReadMetadataWithMissingEtag() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(new DialFileApi.Attributes(null, null, null, 0L, List.of("READ"), null, List.of()));
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        assertThatExceptionOfType(NullPointerException.class)
                .isThrownBy(() -> inputProvider.readMetadata(TEST_CSV_INPUT, TEST_PRINCIPAL))
                .withMessage(
                        "Missing ETag for files/4jrKzSGoHdx8ghxuRKKpkmtPecRdJXt6foQZzt3iGq1b/country%20-%20data.csv");

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);
    }

    @Test
    void testCachingMetadataForInvalidCsv() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES)
                .thenReturn(TEST_ATTRIBUTES);

        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(new EtaggedStream(null, InputStream.nullInputStream(), TEST_INPUT_ETAG));

        ArgumentCaptor<String> loadSchemaPathCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadCsvSchema(loadSchemaPathCaptor.capture()))
                .thenReturn(null)
                .thenThrow(new ParserException("The document doesn't have headers."));
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> inputProvider.readMetadata(TEST_CSV_INPUT, TEST_PRINCIPAL))
                .withMessage("The document doesn't have headers.");

        assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        ArgumentCaptor<String> storeSchemaPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> storeSchemaErrorCaptor = ArgumentCaptor.captor();
        verify(schemaStore).storeCsvSchemaError(storeSchemaPathCaptor.capture(), storeSchemaErrorCaptor.capture());
        assertThat(storeSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);
        assertThat(storeSchemaErrorCaptor.getValue()).isEqualTo("The document doesn't have headers.");

        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> inputProvider.readMetadata(TEST_CSV_INPUT, TEST_PRINCIPAL))
                .withMessage("The document doesn't have headers.");

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_CSV_INPUT);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(loadSchemaPathCaptor.getValue()).isEqualTo(TEST_CSV_SCHEMA_PATH);
    }

    @Test
    void testReadExcelCatalog() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);

        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_EXCEL_INPUT_RESOURCE));

        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);
        ArgumentCaptor<String> loadExcelCatalogPathCaptor = ArgumentCaptor.captor();
        when(schemaStore.loadExcelCatalog(loadExcelCatalogPathCaptor.capture())).thenReturn(null);

        ExcelCatalog actual = inputProvider.readExcelCatalog(TEST_EXCEL_INPUT_PATH, TEST_PRINCIPAL);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(loadExcelCatalogPathCaptor.getValue()).isEqualTo(TEST_EXCEL_SCHEMA_PATH);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        ArgumentCaptor<String> storeExcelCatalogPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<ExcelCatalog> storeExcelCatalogCatalogCaptor = ArgumentCaptor.captor();
        verify(schemaStore).storeExcelCatalog(
                storeExcelCatalogPathCaptor.capture(),
                storeExcelCatalogCatalogCaptor.capture());
        assertThat(storeExcelCatalogPathCaptor.getValue()).isEqualTo(TEST_EXCEL_SCHEMA_PATH);
        assertThat(storeExcelCatalogCatalogCaptor.getValue()).isEqualTo(TEST_CATALOG);

        assertThat(actual).isEqualTo(TEST_CATALOG);
    }

    @Test
    void testPreview() throws Exception {
        ArgumentCaptor<String> getAttributesPathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesPermissionsCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Boolean> getAttributesRecursiveCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<String> getAttributesTokenCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> getAttributesPrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.getAttributes(
                getAttributesPathCaptor.capture(),
                getAttributesPermissionsCaptor.capture(),
                getAttributesRecursiveCaptor.capture(),
                getAttributesTokenCaptor.capture(),
                getAttributesPrincipalCaptor.capture()))
                .thenReturn(TEST_ATTRIBUTES);

        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(TEST_INPUT_ETAG, TEST_EXCEL_INPUT_RESOURCE));

        List<ExcelCell> expected = List.of(
                new ExcelCell(0, 0, "country"),
                new ExcelCell(1, 0, "USA"),
                new ExcelCell(0, 1, "date"),
                new ExcelCell(1, 1, "1/1/21"));

        Range range = new Range(0, 2, 0, 2);
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        List<ExcelCell> actual = inputProvider.preview(TEST_EXCEL_INPUT, range, TEST_PRINCIPAL);

        assertThat(getAttributesPathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(getAttributesPermissionsCaptor.getValue()).isTrue();
        assertThat(getAttributesRecursiveCaptor.getValue()).isFalse();
        assertThat(getAttributesTokenCaptor.getValue()).isNull();
        assertThat(getAttributesPrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getValue()).isEqualTo(TEST_EXCEL_INPUT_PATH);
        assertThat(readFilePrincipalCaptor.getValue()).isEqualTo(TEST_PRINCIPAL);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testPreviewWithRetry() throws Exception {
        when(dialFileApi.getAttributes(any(), anyBoolean(), anyBoolean(), any(), any()))
                .thenReturn(TEST_ATTRIBUTES);

        ArgumentCaptor<String> readFilePathCaptor = ArgumentCaptor.captor();
        ArgumentCaptor<Principal> readFilePrincipalCaptor = ArgumentCaptor.captor();
        String newEtag = "different etag";
        when(dialFileApi.readFile(readFilePathCaptor.capture(), readFilePrincipalCaptor.capture()))
                .thenReturn(Utils.resourceStream(newEtag, TEST_EXCEL_INPUT_RESOURCE))
                .thenReturn(Utils.resourceStream(newEtag, TEST_EXCEL_INPUT_RESOURCE));

        List<ExcelCell> expected = List.of(
                new ExcelCell(0, 0, "country"),
                new ExcelCell(1, 0, "USA"),
                new ExcelCell(0, 1, "date"),
                new ExcelCell(1, 1, "1/1/21"));

        Range range = new Range(0, 2, 0, 2);
        DialInputProvider inputProvider = new DialInputProvider(dialFileApi, schemaStore);

        List<ExcelCell> actual = inputProvider.preview(TEST_EXCEL_INPUT, range, TEST_PRINCIPAL);

        assertThat(readFilePathCaptor.getAllValues()).isEqualTo(List.of(TEST_EXCEL_INPUT_PATH, TEST_EXCEL_INPUT_PATH));
        assertThat(readFilePrincipalCaptor.getAllValues()).isEqualTo(List.of(TEST_PRINCIPAL, TEST_PRINCIPAL));

        assertThat(actual).isEqualTo(expected);
    }
}