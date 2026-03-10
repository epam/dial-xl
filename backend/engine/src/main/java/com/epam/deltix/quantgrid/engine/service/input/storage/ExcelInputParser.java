package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelCellReader;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelDataConsumer;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelDataHandler;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelMetadataReader;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelTableReader;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelUtils;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelWorkbook;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.SAXStopException;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.ParserException;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.opc.PackagePart;
import org.apache.poi.openxml4j.opc.PackageRelationship;
import org.apache.poi.util.IOUtils;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFRelation;
import org.apache.xmlbeans.XmlException;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTTable;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTTableColumn;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.TableDocument;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import javax.annotation.Nullable;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

@UtilityClass
public class ExcelInputParser {
    private static final int MAX_FILE_SIZE_IN_BYTES = 500 * 1024 * 1024;

    static {
        IOUtils.setByteArrayMaxOverride(MAX_FILE_SIZE_IN_BYTES); // Increase max size for Excel files
    }

    public ExcelWorkbook loadWorkbook(InputStream stream) throws IOException {
        return readExcelPackage(stream, reader -> {
            SharedStrings sharedStrings = reader.getSharedStringsTable();
            StylesTable styles = reader.getStylesTable();
            XSSFReader.SheetIterator sheets = reader.getSheetIterator();
            List<ExcelWorkbook.Sheet> result = new ArrayList<>();
            while (sheets.hasNext()) {
                try (InputStream sheetStream = sheets.next()) {
                    Map<String, Range> tables = readSheetTables(sheets.getSheetPart()).stream()
                            .collect(Collectors.toUnmodifiableMap(
                                    CTTable::getName,
                                    table -> ExcelUtils.refToRange(table.getRef())));
                    ExcelCellReader previewReader = new ExcelCellReader(sharedStrings, styles);
                    readSheet(sheetStream, previewReader);
                    result.add(new ExcelWorkbook.Sheet(sheets.getSheetName(), tables, previewReader.columns()));
                }
            }

            return new ExcelWorkbook(result);
        });
    }

    public ExcelCatalog readCatalog(InputStream stream) throws IOException {
        return readExcelPackage(stream, reader -> {
            List<String> sheetNames = new ArrayList<>();
            List<String> tableNames = new ArrayList<>();
            XSSFReader.SheetIterator sheets = reader.getSheetIterator();
            while (sheets.hasNext()) {
                try (InputStream ignored = sheets.next()) {
                    sheetNames.add(sheets.getSheetName());
                    List<CTTable> tables = readSheetTables(sheets.getSheetPart());
                    for (CTTable table : tables) {
                        tableNames.add(table.getName());
                    }
                }
            }
            return new ExcelCatalog(sheetNames, tableNames);
        });
    }

    public ExcelInputMetadata.ExcelTable inferSchema(InputStream stream, ExcelTableKey key) throws IOException {
        return readExcelPackage(stream, reader -> {
            XSSFReader.SheetIterator sheets = reader.getSheetIterator();
            while (sheets.hasNext()) {
                try (InputStream sheetStream = sheets.next()) {
                    if (key instanceof ExcelTableKey.Table tableKey) {
                        PackagePart sheetPart = sheets.getSheetPart();
                        List<CTTable> tables = readSheetTables(sheetPart);
                        for (CTTable table : tables) {
                            String name = table.getName();
                            if (Objects.equals(name, tableKey.name())) {
                                return parseTableMetadata(
                                        sheets.getSheetName(), sheetStream, reader.getStylesTable(), table);
                            }
                        }
                    } else if (key instanceof ExcelTableKey.Sheet sheetKey) {
                        String sheetName = sheets.getSheetName();
                        if (Objects.equals(sheetName, sheetKey.name())) {
                            return parseSheetMetadata(sheetName, sheetStream, reader, sheetKey.range(), sheetKey.headers());
                        }
                    } else {
                        throw new ParserException("Unknown ExcelTableKey type: " + key.getClass().getName());
                    }
                }
            }
            throw new ParserException("Table not found: " + key);
        });
    }

    private ExcelInputMetadata.ExcelTable parseTableMetadata(
            String sheetName, InputStream stream, StylesTable styles, CTTable table)
            throws IOException {
        Range range = ExcelUtils.refToRange(table.getRef());
        range = new Range(
                range.startRow() + Util.toIntSize(table.getHeaderRowCount()), // Skip header row
                range.endRow() - Util.toIntSize(table.getTotalsRowCount()), // Skip totals row
                range.startColumn(),
                range.endColumn());
        ExcelMetadataReader metadataReader = new ExcelMetadataReader(
                null, styles, range, false);
        readSheet(stream, metadataReader);

        List<String> headers = table.getTableColumns().getTableColumnList().stream()
                .map(CTTableColumn::getName)
                .toList();
        List<InputColumnType> types = metadataReader.types();
        if (types.size() != headers.size()) {
            throw new ParserException("Inferred types count does not match headers count for table: "
                    + table.getName());
        }

        int startColumn = range.startColumn();
        List<ColumnMetadata> columns = IntStream.range(0, headers.size())
                .mapToObj(i -> new ColumnMetadata(
                        headers.get(i), startColumn + i, doubleIfNull(types.get(i))))
                .toList();

        return new ExcelInputMetadata.ExcelTable(sheetName, range.startRow(), range.endRow(), columns);
    }

    private ExcelInputMetadata.ExcelTable parseSheetMetadata(
            String sheetName,
            InputStream stream,
            XSSFReader reader,
            @Nullable String ref,
            boolean headers) throws IOException, InvalidFormatException {
        Range range = StringUtils.isNotBlank(ref) ? ExcelUtils.refToRange(ref) : ExcelUtils.maxRange();
        List<ColumnMetadata> columns = new ArrayList<>();
        StylesTable styles = reader.getStylesTable();
        if (!headers) {
            ExcelMetadataReader metadataReader = new ExcelMetadataReader(
                    null, styles, range, false);
            readSheet(stream, metadataReader);
            for (int i = 0; i < metadataReader.types().size(); ++i) {
                InputColumnType type = metadataReader.types().get(i);
                if (type != null) {
                    int index = range.startColumn() + i;
                    columns.add(new ColumnMetadata(InputUtils.toColumnName(columns.size()), index, type));
                }
            }
            return new ExcelInputMetadata.ExcelTable(
                    sheetName, metadataReader.consumedStartRow(), metadataReader.consumedEndRow(), columns);
        }

        SharedStrings sharedStrings = reader.getSharedStringsTable();
        ExcelMetadataReader metadataReader = new ExcelMetadataReader(
                sharedStrings, styles, range, true);
        readSheet(stream, metadataReader);
        Set<String> uniqueHeaders = new HashSet<>();
        for (int i = 0; i < metadataReader.types().size(); ++i) {
            InputColumnType type = metadataReader.types().get(i);
            String header = i < metadataReader.names().size()
                    ? metadataReader.names().get(i)
                    : null;
            if (StringUtils.isBlank(header)) {
                if (type != null) {
                    header = InputUtils.generateColumnName(uniqueHeaders, columns.size());
                    uniqueHeaders.add(header);
                    int index = range.startColumn() + i;
                    columns.add(new ColumnMetadata(header, index, type));
                }
            } else {
                if (!uniqueHeaders.add(header)) {
                    throw new ParserException("Duplicate header: " + header);
                }
                int index = range.startColumn() + i;
                columns.add(new ColumnMetadata(header, index, doubleIfNull(type)));
            }
        }
        for (int i = metadataReader.types().size(); i < metadataReader.names().size(); ++i) {
            String header = metadataReader.names().get(i);
            if (StringUtils.isNotBlank(header)) {
                if (!uniqueHeaders.add(header)) {
                    throw new ParserException("Duplicate header: " + header);
                }
                int index = range.startColumn() + i;
                columns.add(new ColumnMetadata(header, index, InputColumnType.DOUBLE));
            }
        }
        return new ExcelInputMetadata.ExcelTable(
                sheetName, metadataReader.consumedStartRow(), metadataReader.consumedEndRow(), columns);
    }

    private InputColumnType doubleIfNull(InputColumnType type) {
        return Objects.requireNonNullElse(type, InputColumnType.DOUBLE);
    }

    private List<CTTable> readSheetTables(PackagePart sheetPart)
            throws IOException, InvalidFormatException {
        List<CTTable> result = new ArrayList<>();
        for (PackageRelationship relationship : sheetPart.getRelationshipsByType(XSSFRelation.TABLE.getRelation())) {
            PackagePart tablePart = sheetPart.getRelatedPart(relationship);
            try (InputStream stream = tablePart.getInputStream()) {
                TableDocument table = TableDocument.Factory.parse(stream);
                result.add(table.getTable());
            } catch (XmlException e) {
                throw new ParserException("Failed to parse table XML", e);
            }
        }

        return result;
    }

    private void readSheet(InputStream stream, ExcelDataConsumer consumer)
            throws IOException {
        try {
            SAXParserFactory factory = SAXParserFactory.newInstance();
            SAXParser parser = factory.newSAXParser();
            XMLReader reader = parser.getXMLReader();
            reader.setContentHandler(new ExcelDataHandler(consumer));
            reader.parse(new InputSource(stream));
        } catch (SAXStopException ignore) {
            // Parsing finished early and successfully
        } catch (SAXException | ParserConfigurationException e) {
            throw new ParserException("Failed to parse sheet XML.", e);
        }
    }

    public LocalTable parseExcelInput(
            InputStream stream, ExcelInputMetadata.ExcelTable table, List<String> columnNames) throws IOException {

        Map<String, ColumnMetadata> columnMap = table.columns().stream()
                .collect(Collectors.toUnmodifiableMap(ColumnMetadata::name, Function.identity()));

        Util.verify(columnMap.keySet().containsAll(columnNames),
                "Read columns should be a subset of columns from the source");

        List<ColumnMetadata> columns = columnNames.stream()
                .map(columnMap::get)
                .toList();

        return readExcelPackage(stream, reader -> {
            StylesTable stylesTable = reader.getStylesTable();
            SharedStrings sharedStrings = reader.getSharedStringsTable();
            ExcelTableReader tableReader = new ExcelTableReader(
                    stylesTable, sharedStrings, table.startRow(), table.endRow(), columns);
            XSSFReader.SheetIterator sheets = reader.getSheetIterator();
            while (sheets.hasNext()) {
                try (InputStream sheetStream = sheets.next()) {
                    if (table.sheet().equals(sheets.getSheetName())) {
                        readSheet(sheetStream, tableReader);
                        return InputUtils.toLocalTable(tableReader.result());
                    }
                }
            }

            throw new IllegalArgumentException("Sheet not found: " + table.sheet());
        });
    }

    private <T> T readExcelPackage(InputStream stream, XSSFReaderFunction<T> function) throws IOException {
        try (OPCPackage pkg = OPCPackage.open(stream)) {
            XSSFReader reader = new XSSFReader(pkg);
            reader.setUseReadOnlySharedStringsTable(true); // Use less memory for shared strings
            return function.apply(reader);
        } catch (OpenXML4JException e) {
            throw new ParserException("Failed to open XLSX package", e);
        }
    }

    private interface XSSFReaderFunction<T> {
        T apply(XSSFReader reader) throws IOException, OpenXML4JException;
    }
}