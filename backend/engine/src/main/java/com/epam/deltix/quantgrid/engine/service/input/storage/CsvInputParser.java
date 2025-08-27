package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.DeduplicateSet;
import com.epam.deltix.quantgrid.util.ParserException;
import com.epam.deltix.quantgrid.util.ParserUtils;
import com.epam.deltix.quantgrid.util.Strings;
import com.univocity.parsers.common.IterableResult;
import com.univocity.parsers.common.ParsingContext;
import com.univocity.parsers.common.TextParsingException;
import com.univocity.parsers.csv.Csv;
import com.univocity.parsers.csv.CsvParser;
import com.univocity.parsers.csv.CsvParserSettings;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.StringUtils;

import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;

@UtilityClass
public class CsvInputParser {
    private static final int MAX_COLUMN_DEDUPLICATION_COUNT = Integer.MAX_VALUE;
    private static final int MAX_ROWS_TO_BUILD_METADATA = Integer.MAX_VALUE;
    private static final int MAX_COLUMNS = 512;
    private static final int MAX_CHARS = 1_048_576;

    public LinkedHashMap<String, InputColumnType> inferSchema(Reader reader) {
        try {
            CsvParser parser = new CsvParser(inputCsvSettings());
            IterableResult<String[], ParsingContext> rows = parser.iterate(reader);

            LinkedHashMap<String, Boolean> parsedHeader = parseHeader(rows.getContext().headers());
            List<InputColumnType> columnTypes = new ArrayList<>(Collections.nCopies(parsedHeader.size(), null));
            int processedRows = 0;
            for (String[] row : rows) {
                for (int i = 0; i < row.length; i++) {
                    if (i == columnTypes.size()) {
                        columnTypes.add(null);
                        String columnName = generateColumnName(parsedHeader.keySet(), i);
                        parsedHeader.put(columnName, Boolean.FALSE);
                    }

                    InputColumnType prevType = columnTypes.get(i);

                    if (prevType != InputColumnType.STRING) {
                        columnTypes.set(i, ParserUtils.inferType(emptyIfNull(row[i]), prevType));
                    }
                }

                if (processedRows++ == MAX_ROWS_TO_BUILD_METADATA) {
                    break;
                }
            }

            LinkedHashMap<String, InputColumnType> schema = new LinkedHashMap<>();
            int index = 0;
            for (Map.Entry<String, Boolean> entry : parsedHeader.entrySet()) {
                String columnName = entry.getKey();
                InputColumnType columnType = columnTypes.get(index++);
                schema.put(columnName, columnType == null && entry.getValue() ? InputColumnType.DOUBLE : columnType);
            }

            return schema;
        } catch (TextParsingException e) {
            if (e.getColumnIndex() > MAX_COLUMNS) {
                throw new ParserException(
                        "The document exceeds the maximum column count of %d.".formatted(MAX_COLUMNS));
            }

            if (e.getParsedContent() != null && e.getParsedContent().length() >= MAX_CHARS) {
                // Likely that the value exceeds the buffer size, but cannot confirm due to lack of specific error flags
                throw new ParserException(
                        "Value exceeds max size of %d at column number %d, row %d."
                                .formatted(MAX_CHARS, e.getColumnIndex() + 1, e.getLineIndex() + 1));
            }

            throw e;
        }
    }

    /**
     * @param reader source CSV data
     * @param readColumns column names to read
     * @param columnTypes full CSV schema
     * @return Object[] of DoubleArrayList(s) for doubles and ObjectArrayList(s) for strings
     */
    public Object[] parseCsvInput(Reader reader,
                                  List<String> readColumns,
                                  LinkedHashMap<String, InputColumnType> columnTypes) {

        Map<String, ObjectArrayList<String>> stringColumns = new HashMap<>();
        Map<String, DoubleArrayList> doubleColumns = new HashMap<>();

        int expectedColumns = readColumns.size();
        int columnIndex = 0;
        StringConsumer[] consumers = new StringConsumer[expectedColumns];
        for (String columnName : readColumns) {
            InputColumnType columnType = columnTypes.get(columnName);

            if (columnType == InputColumnType.STRING) {
                DeduplicateSet<String> set = new DeduplicateSet<>();
                ObjectArrayList<String> stringData = new ObjectArrayList<>();
                consumers[columnIndex++] = s -> stringData.add(set.add(ParserUtils.parseString(s)));
                stringColumns.put(columnName, stringData);
            } else {
                DoubleArrayList doubleData = new DoubleArrayList();
                consumers[columnIndex++] = switch (columnType) {
                    case DATE -> s -> doubleData.add(Dates.from(s));
                    case BOOLEAN -> s -> doubleData.add(ParserUtils.parseBoolean(s));
                    case DOUBLE -> s -> doubleData.add(ParserUtils.parseDouble(s));
                    default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
                };
                doubleColumns.put(columnName, doubleData);
            }
        }

        parse(consumers, columnTypes.keySet(), readColumns, reader);

        Object[] columns = new Object[expectedColumns];
        columnIndex = 0;
        for (String columnName : readColumns) {
            InputColumnType columnType = columnTypes.get(columnName);

            if (columnType == InputColumnType.STRING) {
                columns[columnIndex++] = stringColumns.get(columnName);
            } else {
                columns[columnIndex++] = doubleColumns.get(columnName);
            }
        }

        return columns;
    }

    private void parse(StringConsumer[] consumers,
                       Collection<String> allColumns,
                       List<String> columnsToRead,
                       Reader reader) {
        int index = 0;
        Object2IntMap<String> columnIndices = new Object2IntOpenHashMap<>();
        for (String columnName : allColumns) {
            columnIndices.put(columnName, index++);
        }
        // carry only required columns
        CsvParserSettings settings = inputCsvSettings();
        settings.selectIndexes(columnsToRead.stream()
                .map(columnIndices::getInt)
                .toArray(Integer[]::new));

        CsvParser parser = new CsvParser(settings);
        for (String[] row : parser.iterate(reader)) {
            for (int i = 0; i < columnsToRead.size(); i++) {
                consumers[i].accept(emptyIfNull(row[i]));
            }
        }
    }

    private CsvParserSettings inputCsvSettings() {
        CsvParserSettings settings = Csv.parseRfc4180();
        settings.setLineSeparatorDetectionEnabled(true);
        settings.setHeaderExtractionEnabled(true);
        settings.setIgnoreTrailingWhitespaces(true);
        settings.setIgnoreLeadingWhitespaces(true);
        settings.setSkipEmptyLines(true);
        settings.setMaxCharsPerColumn(MAX_CHARS);
        settings.setMaxColumns(MAX_COLUMNS);

        return settings;
    }

    private LinkedHashMap<String, Boolean> parseHeader(String[] headers) {
        if (headers == null) {
            throw new ParserException("The document doesn't have headers.");
        }

        List<String> escapedHeaders = Arrays.stream(headers)
                .map(CsvInputParser::emptyIfNull)
                .toList();
        Set<String> uniqueHeaders = new HashSet<>(escapedHeaders);
        LinkedHashMap<String, Boolean> result = new LinkedHashMap<>();
        for (int i = 0; i < escapedHeaders.size(); ++i) {
            String header = escapedHeaders.get(i);
            if (StringUtils.isBlank(header)) {
                String columnName = generateColumnName(uniqueHeaders, i);
                result.put(columnName, Boolean.FALSE);
            } else if (result.put(header, Boolean.TRUE) != null) {
                throw new ParserException("Column names must be unique. Duplicate found: %s.".formatted(header));
            }
        }

        return result;
    }

    private String generateColumnName(Set<String> existingNames, int index) {
        String name = "Column" + (index + 1);
        if (!existingNames.contains(name)) {
            return name;
        }

        for (int i = 1; i < MAX_COLUMN_DEDUPLICATION_COUNT; ++i) {
            String deduplicatedName = name + "_" + (i + 1);
            if (!existingNames.contains(deduplicatedName)) {
                return deduplicatedName;
            }
        }

        throw new ParserException("Cannot generate a new column name. Maximum number " + MAX_COLUMN_DEDUPLICATION_COUNT
                + " is reached.");
    }

    private String emptyIfNull(String value) {
        return Objects.requireNonNullElse(value, Strings.EMPTY);
    }

    private interface StringConsumer extends Consumer<String> {
    }
}
