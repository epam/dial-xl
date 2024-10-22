package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.DeduplicateSet;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.ParserException;
import com.epam.deltix.quantgrid.util.ParserUtils;
import com.epam.deltix.quantgrid.util.ParserException;
import com.epam.deltix.quantgrid.util.type.EscapeType;
import com.univocity.parsers.common.IterableResult;
import com.univocity.parsers.common.ParsingContext;
import com.univocity.parsers.csv.Csv;
import com.univocity.parsers.csv.CsvParser;
import com.univocity.parsers.csv.CsvParserSettings;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;

import java.io.Reader;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class CsvInputParser {

    private static final int MAX_ROWS_TO_BUILD_METADATA = Integer.MAX_VALUE;

    public static LinkedHashMap<String, ColumnType> inferSchema(Reader reader) {
        CsvParser parser = new CsvParser(metadataCsvSettings());
        IterableResult<String[], ParsingContext> rows = parser.iterate(reader);

        List<String> columnNames = Arrays.stream(rows.getContext().headers())
                .map(ParserUtils::parseColumnName)
                .map(header -> ParserUtils.decodeEscapes(header, EscapeType.STRING))
                .toList();

        ColumnType[] columnTypes = new ColumnType[columnNames.size()];

        if (columnNames.size() != new HashSet<>(columnNames).size()) {
            throw new ParserException("Column names must be unique: " + columnNames);
        }

        int processedRows = 0;
        for (String[] row : rows) {
            // Some parsers treat CSV as a valid if values in a rows are missing, some require strict definition.
            // We choose a strict definition for now for better ambiguity detection in overrides.
            // It can be reconsidered later.
            // Please note, that parseInput() still can handle missing values if any.
            if (row.length != columnTypes.length) {
                throw new ParserException(
                        "Expected " + columnTypes.length + " values per row, but was: " + row.length);
            }

            for (int i = 0; i < row.length; i++) {
                ColumnType prevType = columnTypes[i];

                if (prevType != ColumnType.STRING) {
                    columnTypes[i] = ParserUtils.inferType(row[i], prevType);
                }
            }

            if (processedRows++ == MAX_ROWS_TO_BUILD_METADATA) {
                break;
            }
        }

        LinkedHashMap<String, ColumnType> schema = new LinkedHashMap<>();

        for (int i = 0; i < columnTypes.length; i++) {
            String columnName = columnNames.get(i);
            ColumnType columnType = columnTypes[i];
            schema.put(columnName, (columnType == null) ? ColumnType.STRING : columnType);
        }

        return schema;
    }

    /**
     * @param reader source CSV data
     * @param readColumns column names to read
     * @param columnTypes full CSV schema
     * @return Object[] of DoubleArrayList(s) for doubles and ObjectArrayList(s) for strings
     */
    public static Object[] parseCsvInput(Reader reader,
                                         List<String> readColumns,
                                         LinkedHashMap<String, ColumnType> columnTypes) {

        Map<String, ObjectArrayList<String>> stringColumns = new HashMap<>();
        Map<String, DoubleArrayList> doubleColumns = new HashMap<>();

        int expectedColumns = readColumns.size();
        int columnIndex = 0;
        StringConsumer[] consumers = new StringConsumer[expectedColumns];
        for (String columnName : readColumns) {
            ColumnType columnType = columnTypes.get(columnName);

            if (columnType == ColumnType.STRING) {
                DeduplicateSet<String> set = new DeduplicateSet<>();
                ObjectArrayList<String> stringData = new ObjectArrayList<>();
                consumers[columnIndex++] = s -> stringData.add(set.add(s));
                stringColumns.put(columnName, stringData);
            } else {
                DoubleArrayList doubleData = new DoubleArrayList();
                consumers[columnIndex++] = switch (columnType) {
                    case DATE -> s -> doubleData.add(Dates.from(s));
                    case BOOLEAN -> s -> doubleData.add(ParserUtils.parseBoolean(s));
                    case DOUBLE -> s -> doubleData.add(ParserUtils.parseDouble(s));
                    case INTEGER -> s -> doubleData.add(ParserUtils.parseLong(s));
                    default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
                };
                doubleColumns.put(columnName, doubleData);
            }
        }

        parse(consumers, readColumns, reader, inputCsvSettings());

        Object[] columns = new Object[expectedColumns];
        columnIndex = 0;
        for (String columnName : readColumns) {
            ColumnType columnType = columnTypes.get(columnName);

            if (columnType.isString()) {
                columns[columnIndex++] = stringColumns.get(columnName);
            } else if (columnType.isDouble()) {
                columns[columnIndex++] = doubleColumns.get(columnName);
            } else {
                throw new UnsupportedOperationException("Unsupported column type: " + columnType);
            }
        }

        return columns;
    }

    private static void parse(StringConsumer[] consumers,
                              List<String> columnsToRead,
                              Reader reader,
                              CsvParserSettings settings) {
        // carry only required columns
        settings.selectFields(columnsToRead.toArray(String[]::new));

        CsvParser parser = new CsvParser(settings);
        for (String[] row : parser.iterate(reader)) {
            for (int i = 0; i < columnsToRead.size(); i++) {
                consumers[i].accept(row[i]);
            }
        }
    }

    private static CsvParserSettings metadataCsvSettings() {
        CsvParserSettings settings = inputCsvSettings();
        settings.setMaxCharsPerColumn(1_048_576);
        settings.setInputBufferSize(1_000);
        settings.setKeepQuotes(true);

        return settings;
    }

    private static CsvParserSettings inputCsvSettings() {
        CsvParserSettings settings = Csv.parseRfc4180();
        settings.setLineSeparatorDetectionEnabled(true);
        settings.setHeaderExtractionEnabled(true);
        settings.setIgnoreTrailingWhitespaces(true);
        settings.setIgnoreLeadingWhitespaces(true);
        settings.setSkipEmptyLines(true);
        settings.setMaxCharsPerColumn(1_048_576);

        return settings;
    }

    private static CsvParserSettings overrideCsvSettings() {
        CsvParserSettings settings = inputCsvSettings();
        settings.setKeepQuotes(true);

        return settings;
    }

    private interface StringConsumer extends Consumer<String> {
    }
}
