package com.epam.deltix.quantgrid.service.parser;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.DeduplicateSet;
import com.epam.deltix.quantgrid.util.ExcelDateTime;
import com.epam.deltix.quantgrid.util.ParserUtils;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class CsvInputParser {

    private static final int MAX_ROWS_TO_BUILD_METADATA = Integer.MAX_VALUE;

    public static LinkedHashMap<String, ColumnType> inferSchema(Reader reader, boolean isInput) {
        CsvParser parser = new CsvParser(metadataCsvSettings(isInput));
        IterableResult<String[], ParsingContext> rows = parser.iterate(reader);

        LinkedHashMap<String, ColumnType> columnTypes = new LinkedHashMap<>();
        String[] columnNames = rows.getContext().headers();
        if (!isInput) {
            columnNames = Arrays.stream(columnNames).map(ParserUtils::parseHeader).toArray(String[]::new);
        }

        int processedRows = 0;
        for (String[] row : rows) {

            // Some parsers treat CSV as a valid if values in a rows are missing, some require strict definition.
            // We choose a strict definition for now for better ambiguity detection in overrides.
            // It can be reconsidered later.
            // Please note, that parseInput() still can handle missing values if any.
            if (row.length != columnNames.length) {
                throw new RuntimeException(
                        "Expected " + columnNames.length + " values per row, but was: " + row.length);
            }

            for (int columnIndex = 0; columnIndex < row.length; columnIndex++) {
                ColumnType columnType = ParserUtils.inferType(row[columnIndex]);

                if (columnType != null) {
                    String columnName = columnNames[columnIndex];
                    // fill or resolve column type
                    columnTypes.compute(columnName, (k, v) -> ParserUtils.resolveColumnType(v, columnType));
                }
            }

            if (isInput && processedRows >= MAX_ROWS_TO_BUILD_METADATA) {
                break;
            }
            processedRows++;
        }

        // If column type is not defined treat it as string
        ColumnType defaultType = isInput ? ColumnType.STRING : ColumnType.DOUBLE;
        Arrays.stream(columnNames).forEach(column -> columnTypes.computeIfAbsent(column, k -> defaultType));

        return columnTypes;
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
                    case DATE -> s -> doubleData.add(ExcelDateTime.from(s));
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

    public static ObjectArrayList<OverrideValue>[] parseOverrideInput(Reader reader,
                                                                      LinkedHashMap<String, ColumnType> columnTypes) {
        Map<String, ObjectArrayList<OverrideValue>> overrideColumns = new HashMap<>();

        List<String> readColumns = columnTypes.keySet().stream().toList();

        int expectedColumns = readColumns.size();
        int columnIndex = 0;
        StringConsumer[] consumers = new StringConsumer[expectedColumns];
        for (String columnName : readColumns) {
            ColumnType columnType = columnTypes.get(columnName);
            ObjectArrayList<OverrideValue> columnData = new ObjectArrayList<>();

            if (columnType == ColumnType.STRING) {
                consumers[columnIndex++] = s -> columnData.add(ParserUtils.parseOverrideString(s));
                overrideColumns.put(columnName, columnData);

            } else {
                consumers[columnIndex++] = switch (columnType) {
                    case DATE -> s -> columnData.add(ParserUtils.parseOverrideDate(s));
                    case BOOLEAN -> s -> columnData.add(ParserUtils.parseOverrideBoolean(s));
                    case DOUBLE -> s -> columnData.add(ParserUtils.parseOverrideDouble(s));
                    case INTEGER -> s -> columnData.add(ParserUtils.parseOverrideLong(s));
                    default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
                };
                overrideColumns.put(columnName, columnData);
            }
        }

        parse(consumers, readColumns, reader, overrideCsvSettings());

        ObjectArrayList<OverrideValue>[] columns = new ObjectArrayList[expectedColumns];
        columnIndex = 0;
        for (String columnName : readColumns) {
            columns[columnIndex++] = overrideColumns.get(columnName);
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

    private static CsvParserSettings metadataCsvSettings(boolean isInput) {
        CsvParserSettings settings = inputCsvSettings();
        settings.setInputBufferSize(1_000);
        settings.setKeepQuotes(!isInput);

        return settings;
    }

    private static CsvParserSettings inputCsvSettings() {
        CsvParserSettings settings = Csv.parseRfc4180();
        settings.setLineSeparatorDetectionEnabled(true);
        settings.setHeaderExtractionEnabled(true);
        settings.setIgnoreTrailingWhitespaces(true);
        settings.setIgnoreLeadingWhitespaces(true);
        settings.setSkipEmptyLines(true);
        settings.setMaxCharsPerColumn(16384);

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
