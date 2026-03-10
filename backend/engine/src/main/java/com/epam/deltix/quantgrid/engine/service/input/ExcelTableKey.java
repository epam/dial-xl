package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.engine.service.input.storage.InputUtils;

import java.util.Map;
import javax.annotation.Nullable;

public interface ExcelTableKey {
    String format();

    record Table(String name) implements ExcelTableKey {
        public String format() {
            return "table=" + name;
        }
    }

    record Sheet(String name, @Nullable String range, boolean headers) implements ExcelTableKey {
        public String format() {
            return "sheet=" + name +
                    (range != null ? ", range=" + range : "") +
                    ", headers=" + headers;
        }
    }

    static ExcelTableKey fromQuery(String query) {
        Map<String, String> params = InputUtils.parseQueryParameters(query);
        String table = params.get("table");
        String sheet = params.get("sheet");

        if ((table == null) == (sheet == null)) {
            throw new IllegalArgumentException("Specify exactly one of: table, sheet");
        }

        if (table != null) {
            return new Table(table);
        }

        boolean headers = Boolean.parseBoolean(params.getOrDefault("headers", "false"));
        String area = params.get("range");
        return new Sheet(sheet, area, headers);
    }
}
