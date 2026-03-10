package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.util.ParserException;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.logging.log4j.util.Strings;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@UtilityClass
public class InputUtils {
    private static final int MAX_COLUMN_DEDUPLICATION_COUNT = Integer.MAX_VALUE;

    public LocalTable toLocalTable(Object[] values) {
        if (values.length == 0) {
            return LocalTable.ZERO;
        }

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

    public Map<String, String> parseQueryParameters(String query) {
        if (Strings.isBlank(query)) {
            return Map.of();
        }

        String[] pairs = query.split("&");
        LinkedHashMap<String, String> params = new LinkedHashMap<>();
        for (String pair : pairs) {
            String[] keyValue = pair.split("=", 2);
            String key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8);
            String value = keyValue.length > 1 ? URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8) : null;
            params.put(key, value);
        }
        return params;
    }

    public String generateColumnName(Set<String> existingNames, int index) {
        String name = toColumnName(index);
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

    public String toColumnName(int index) {
        return "Column" + (index + 1);
    }
}
