package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
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
import it.unimi.dsi.fastutil.ints.Int2ObjectLinkedOpenHashMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.StringUtils;

import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import javax.annotation.Nullable;

@UtilityClass
public class CsvInputParser {
    private static final int MAX_COLUMN_DEDUPLICATION_COUNT = Integer.MAX_VALUE;
    private static final int MAX_ROWS_TO_BUILD_METADATA = Integer.MAX_VALUE;
    private static final int MAX_COLUMNS = 512;
    private static final int MAX_CHARS = 1_048_576;

    public List<CsvColumn> inferSchema(Reader reader, boolean addMissingHeaders) {
        try {
            CsvParser parser = new CsvParser(inputCsvSettings());
            IterableResult<String[], ParsingContext> rows = parser.iterate(reader);

            LinkedHashMap<String, Boolean> parsedHeader = parseHeader(rows.getContext().headers());
            List<InputColumnType> columnTypes = new ArrayList<>(Collections.nCopies(parsedHeader.size(), null));
            int processedRows = 0;
            for (String[] row : rows) {
                for (int i = 0; i < row.length; i++) {
                    if (i == columnTypes.size()) {
                        if (!addMissingHeaders) {
                            break;
                        }

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

            List<CsvColumn> columns = new ArrayList<>();
            int index = 0;
            for (Map.Entry<String, Boolean> entry : parsedHeader.entrySet()) {
                String columnName = entry.getKey();
                InputColumnType columnType = columnTypes.get(index);
                if (columnType != null) {
                    columns.add(new CsvColumn(columnName, index, columnType));
                } else if (entry.getValue()) {
                    columns.add(new CsvColumn(columnName, index, InputColumnType.DOUBLE));
                }
                ++index;
            }

            return columns;
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
     * @param indices column indices to read
     * @param names column names to read
     * @param types expected column types
     * @return Object[] of DoubleArrayList(s) for doubles and ObjectArrayList(s) for strings
     */
    public Object[] parseCsvInput(
            Reader reader,
            @Nullable
            List<Integer> indices,
            @Nullable
            List<String> names,
            List<InputColumnType> types) {
        Util.verify((indices == null) != (names == null),
                "Either indices or names should be provided, but not both.");

        Int2ObjectMap<ObjectArrayList<String>> stringColumns = new Int2ObjectLinkedOpenHashMap<>();
        Int2ObjectMap<DoubleArrayList> doubleColumns = new Int2ObjectLinkedOpenHashMap<>();

        int expectedColumns = types.size();
        StringConsumer[] consumers = new StringConsumer[expectedColumns];
        for (int i = 0; i < types.size(); i++) {
            InputColumnType columnType = types.get(i);

            if (columnType == InputColumnType.STRING) {
                DeduplicateSet<String> set = new DeduplicateSet<>();
                ObjectArrayList<String> stringData = new ObjectArrayList<>();
                consumers[i] = s -> stringData.add(set.add(ParserUtils.parseString(s)));
                stringColumns.put(i, stringData);
            } else {
                DoubleArrayList doubleData = new DoubleArrayList();
                consumers[i] = switch (columnType) {
                    case DATE -> s -> doubleData.add(Dates.fromDate(s));
                    case DATE_TIME -> s -> doubleData.add(Dates.fromDateTime(s));
                    case BOOLEAN -> s -> doubleData.add(ParserUtils.parseBoolean(s));
                    case DOUBLE -> s -> doubleData.add(ParserUtils.parseDouble(s));
                    default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
                };
                doubleColumns.put(i, doubleData);
            }
        }

        Iterable<String[]> rows = parse(reader, indices, names);

        for (String[] row : rows) {
            for (int i = 0; i < types.size(); i++) {
                consumers[i].accept(emptyIfNull(row[i]));
            }
        }

        Object[] columns = new Object[expectedColumns];
        for (int i = 0; i < types.size(); i++) {
            InputColumnType columnType = types.get(i);

            if (columnType == InputColumnType.STRING) {
                columns[i] = stringColumns.get(i);
            } else {
                columns[i] = doubleColumns.get(i);
            }
        }

        return columns;
    }

    private Iterable<String[]> parse(Reader reader, @Nullable List<Integer> indices, @Nullable List<String> names) {
        CsvParserSettings settings = inputCsvSettings();
        // carry only required columns
        if (indices != null) {
            settings.selectIndexes(indices.toArray(Integer[]::new));
        } else {
            settings.selectFields(names.toArray(String[]::new));
        }

        CsvParser parser = new CsvParser(settings);
        return parser.iterate(reader);
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
