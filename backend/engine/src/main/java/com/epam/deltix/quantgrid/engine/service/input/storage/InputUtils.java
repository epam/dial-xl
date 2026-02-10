package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.InputColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.FilenameUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@UtilityClass
public class InputUtils {
    public LocalTable toLocalTable(Object[] values) {
        Column[] columns = new Column[values.length];
        for (int i = 0; i < values.length; i++) {
            Object value = values[i];
            if (value instanceof DoubleArrayList doubles) {
                columns[i] = new DoubleDirectColumn(doubles);
            } else if (value instanceof ObjectArrayList strings) {
                columns[i] = new StringDirectColumn(strings);
            } else {
                throw new UnsupportedOperationException("Unsupported values: " + value.getClass().getSimpleName());
            }
        }

        return new LocalTable(columns);
    }

    public LocalTable readCsvTable(InputStream stream, List<String> readColumns, List<CsvColumn> columns)
            throws IOException {
        try (Reader reader = InputUtils.createReader(stream)) {
            Map<String, CsvColumn> map = columns.stream()
                    .collect(Collectors.toUnmodifiableMap(CsvColumn::name, Function.identity()));
            List<Integer> indices = readColumns.stream()
                    .map(map::get)
                    .map(CsvColumn::index)
                    .toList();
            List<InputColumnType> types = readColumns.stream()
                    .map(map::get)
                    .map(CsvColumn::type)
                    .toList();
            return InputUtils.toLocalTable(
                    CsvInputParser.parseCsvInput(reader, indices, null, types));
        }
    }

    public Reader createReader(InputStream stream) {
        // Avoid using Files.newBufferedReader(inputPath) https://stackoverflow.com/a/43446789
        return new BufferedReader(new InputStreamReader(stream));
    }

    public String getSchemaPath(String path, String etag) {
        String hash = DigestUtils.sha256Hex(path + "/" + etag);
        StringBuilder result = new StringBuilder();
        result.append(hash, 0, 8);
        for (int i = 8; i < hash.length(); i += 8) {
            result.append('/');
            result.append(hash, i, i + 8);
        }
        result.append('.');
        result.append(FilenameUtils.getExtension(path));
        result.append(".json");
        return result.toString();
    }
}
