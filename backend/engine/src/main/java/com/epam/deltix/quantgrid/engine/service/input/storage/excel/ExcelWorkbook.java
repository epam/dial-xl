package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import com.epam.deltix.quantgrid.engine.service.input.ExcelCell;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public record ExcelWorkbook(List<Sheet> sheets) {
    public List<ExcelCell> lookupCells(ExcelTableKey key, Range range) {
        Sheet sheet;
        Range dataRange;
        if (key instanceof ExcelTableKey.Sheet sheetKey) {
            sheet = sheets.stream()
                    .filter(s -> s.name().equals(sheetKey.name()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Sheet %s not found.".formatted(sheetKey.name())));
            dataRange = StringUtils.isNotBlank(sheetKey.range())
                    ? ExcelUtils.refToRange(sheetKey.range())
                    : ExcelUtils.maxRange();
        } else if (key instanceof ExcelTableKey.Table tableKey) {
            sheet = sheets.stream()
                    .filter(s -> s.tables().containsKey(tableKey.name()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Table %s not found.".formatted(tableKey.name())));
            dataRange = sheet.tables().get(tableKey.name());
        } else {
            throw new IllegalStateException("Unsupported ExcelTableKey type: %s.".formatted(key.getClass()));
        }

        range = range.shift(dataRange).intersect(dataRange);

        List<ExcelCell> result = new ArrayList<>();
        for (int c = range.startColumn(); c < range.endColumn(); ++c) {
            ColumnData data = sheet.columns().get(c);
            if (data != null) {
                for (int r = range.startRow(); r < range.endRow(); ++r) {
                    String value = data.getValue(r);
                    if (value != null) {
                        result.add(new ExcelCell(r - dataRange.startRow(), c - dataRange.startColumn(), value));
                    }
                }
            }
        }
        return result;
    }

    public record Sheet(String name, Map<String, Range> tables, Int2ObjectMap<ColumnData> columns) {
    }

    public record ColumnData(int offset, List<String> values) {
        public String getValue(int row) {
            int index = row - offset;
            return index >= 0 && index < values.size() ? values.get(index) : null;
        }

        public void setValue(int row, String value) {
            int index = row - offset;
            if (index < 0) {
                throw new IllegalArgumentException("Row index should be greater than or equal to column offset.");
            }

            ExcelUtils.align(values, index);
            values.set(index, value);
        }
    }
}
