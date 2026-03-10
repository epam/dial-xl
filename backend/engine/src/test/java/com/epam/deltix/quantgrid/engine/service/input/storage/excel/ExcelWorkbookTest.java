package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import com.epam.deltix.quantgrid.engine.service.input.ExcelCell;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ExcelWorkbookTest {
    @Test
    void testLookupSheetCellsInExactWindow() {
        ExcelWorkbook workbook = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet("Sheet1", Map.of(), new Int2ObjectOpenHashMap<>(Map.of(
                        0, new ExcelWorkbook.ColumnData(0, List.of("A1", "A2")),
                        1, new ExcelWorkbook.ColumnData(0, List.of("B1", "B2")))))));

        ExcelTableKey sheetKey = new ExcelTableKey.Sheet("Sheet1", null, false);
        Range range = new Range(0, 2, 0, 2);
        List<ExcelCell> expected = List.of(
                new ExcelCell(0, 0, "A1"),
                new ExcelCell(1, 0, "A2"),
                new ExcelCell(0, 1, "B1"),
                new ExcelCell(1, 1, "B2"));

        List<ExcelCell> actual = workbook.lookupCells(sheetKey, range);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testLookupSheetCellsInMaxIntWindow() {
        ExcelWorkbook workbook = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet("Sheet1", Map.of(), new Int2ObjectOpenHashMap<>(Map.of(
                        0, new ExcelWorkbook.ColumnData(0, List.of("A1", "A2")),
                        1, new ExcelWorkbook.ColumnData(0, List.of("B1", "B2")))))));

        ExcelTableKey sheetKey = new ExcelTableKey.Sheet("Sheet1", null, false);
        Range range = new Range(0, Integer.MAX_VALUE, 0, Integer.MAX_VALUE);
        List<ExcelCell> expected = List.of(
                new ExcelCell(0, 0, "A1"),
                new ExcelCell(1, 0, "A2"),
                new ExcelCell(0, 1, "B1"),
                new ExcelCell(1, 1, "B2"));

        List<ExcelCell> actual = workbook.lookupCells(sheetKey, range);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testLookupSheetCellsInSubWindow() {
        ExcelWorkbook workbook = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet("Sheet1", Map.of(), new Int2ObjectOpenHashMap<>(Map.of(
                        0, new ExcelWorkbook.ColumnData(0, List.of("a", "1")),
                        1, new ExcelWorkbook.ColumnData(0, List.of("b", "2")))))));

        ExcelTableKey sheetKey = new ExcelTableKey.Sheet("Sheet1", null, false);
        Range range = new Range(1, 2, 1, 2);
        List<ExcelCell> expected = List.of(new ExcelCell(1, 1, "2"));

        List<ExcelCell> actual = workbook.lookupCells(sheetKey, range);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testLookupSheetRangeCells() {
        ExcelWorkbook workbook = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet("Sheet1", Map.of("Table1", new Range(1, 2, 1, 2)), new Int2ObjectOpenHashMap<>(Map.of(
                        0, new ExcelWorkbook.ColumnData(0, List.of("A1", "A2", "A3")),
                        1, new ExcelWorkbook.ColumnData(0, List.of("B1", "B2", "B3")),
                        2, new ExcelWorkbook.ColumnData(0, List.of("C1", "C2", "C3")))))));

        ExcelTableKey sheetKey = new ExcelTableKey.Sheet("Sheet1", "B2:B2", false);
        Range range = ExcelUtils.maxRange();
        List<ExcelCell> expected = List.of(new ExcelCell(0, 0, "B2"));

        List<ExcelCell> actual = workbook.lookupCells(sheetKey, range);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testLookupTableCells() {
        ExcelWorkbook workbook = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet("Sheet1", Map.of("Table1", new Range(1, 2, 1, 2)), new Int2ObjectOpenHashMap<>(Map.of(
                        0, new ExcelWorkbook.ColumnData(0, List.of("A1", "A2", "A3")),
                        1, new ExcelWorkbook.ColumnData(0, List.of("B1", "B2", "B3")),
                        2, new ExcelWorkbook.ColumnData(0, List.of("C1", "C2", "C3")))))));

        ExcelTableKey sheetKey = new ExcelTableKey.Table("Table1");
        Range range = ExcelUtils.maxRange();
        List<ExcelCell> expected = List.of(new ExcelCell(0, 0, "B2"));

        List<ExcelCell> actual = workbook.lookupCells(sheetKey, range);

        assertThat(actual).isEqualTo(expected);
    }
}