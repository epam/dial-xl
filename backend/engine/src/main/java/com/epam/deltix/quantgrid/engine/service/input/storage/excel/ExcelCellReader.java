package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.Styles;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Reads cell values and formats them for display.
 *
 * <p>Alternative: {@code XSSFSheetXMLHandler.SheetContentsHandler}. It can be used to receive cell contents
 * during SAX parsing, but it prefixes error cells with {@code "ERROR:"} and provides less control over how
 * values are formatted.
 */
@Accessors(fluent = true)
@RequiredArgsConstructor
public class ExcelCellReader implements ExcelDataConsumer {
    private final DataFormatter formatter = new DataFormatter(Locale.US);
    private final SharedStrings sharedStrings;
    private final Styles styles;
    @Getter
    private final Int2ObjectMap<ExcelWorkbook.ColumnData> columns = new Int2ObjectOpenHashMap<>();

    @Override
    public boolean shouldConsumeRow(int row) {
        return true;
    }

    @Override
    public boolean shouldConsumeColumn(int column) {
        return true;
    }

    @Override
    public boolean shouldFinish(int row) {
        return false;
    }

    @Override
    public void consume(CharSequence value, int row, int column, String type, String style) {
        CellType cellType = ExcelUtils.parseCellType(type);
        String displayValue;
        if (cellType == CellType.STRING) {
            displayValue = ExcelUtils.decodeString(sharedStrings, type, value).toString();
        } else if (cellType == CellType.BOOLEAN) {
            displayValue = "1".contentEquals(value) ? "TRUE" : "FALSE";
        } else if (cellType == CellType.ERROR) {
            displayValue = value.toString();
        } else {
            double numericValue = Double.parseDouble(value.toString());
            if (StringUtils.isBlank(style)) {
                displayValue = formatter.formatRawCellContents(numericValue, 0, "General");
            } else {
                int styleIndex = Integer.parseInt(style);
                XSSFCellStyle cellStyle = styles.getStyleAt(styleIndex);
                short formatIndex = cellStyle.getDataFormat();
                String formatString = cellStyle.getDataFormatString();
                displayValue = formatter.formatRawCellContents(numericValue, formatIndex, formatString);
            }
        }
        ExcelWorkbook.ColumnData data = columns.computeIfAbsent(column, c -> new ExcelWorkbook.ColumnData(row, new ArrayList<>()));
        data.setValue(row, displayValue);
    }
}
