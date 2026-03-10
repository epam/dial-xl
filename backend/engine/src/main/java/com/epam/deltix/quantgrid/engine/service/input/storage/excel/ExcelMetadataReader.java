package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.type.InputColumnType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;

import java.util.ArrayList;
import java.util.List;

@Accessors(fluent = true)
@RequiredArgsConstructor
public class ExcelMetadataReader implements ExcelDataConsumer {
    private final SharedStrings sharedStrings;
    private final StylesTable styles;
    private final Range range;
    private final boolean readHeader;
    @Getter
    private final List<String> names = new ArrayList<>();
    @Getter
    private final List<InputColumnType> types = new ArrayList<>();
    private int headerRow = -1;
    @Getter
    private int consumedStartRow = -1;
    @Getter
    private int consumedEndRow = -1;

    @Override
    public boolean shouldConsumeRow(int row) {
        return row >= range.startRow();
    }

    @Override
    public boolean shouldConsumeColumn(int column) {
        return column >= range.startColumn() && column < range.endColumn();
    }

    @Override
    public boolean shouldFinish(int row) {
        return row >= range.endRow();
    }

    @Override
    public void consume(CharSequence value, int row, int column, String type, String style) {
        if (readHeader && headerRow == -1) {
            headerRow = row;
        }
        CellType cellType = ExcelUtils.parseCellType(type);
        boolean isDateFormatted = cellType == CellType.NUMERIC
                && ExcelUtils.isDateFormatted(styles, style, type);
        int position = column - Util.toIntIndex(range.startColumn());

        if (row == headerRow) {
            double numericValue = cellType == CellType.NUMERIC || cellType == CellType.BOOLEAN
                    ? Double.parseDouble(value.toString())
                    : 0.0;
            String header = ExcelUtils.formatCellValue(
                    cellType,
                    numericValue,
                    isDateFormatted,
                    ExcelUtils.decodeString(sharedStrings, type, value));
            ExcelUtils.align(names, position);
            names.set(position, header);
        } else {
            double numericValue = cellType == CellType.NUMERIC
                    ? Double.parseDouble(value.toString())
                    : 0.0;
            ExcelUtils.align(types, position);
            types.set(position, updateInferredType(types.get(position), cellType, numericValue, isDateFormatted));
            if (consumedStartRow == -1) {
                consumedStartRow = row;
            }
            consumedEndRow = row + 1;
        }
    }

    private static InputColumnType updateInferredType(
            InputColumnType columnType, CellType cellType, double numericValue, boolean isDateFormatted) {
        if (columnType == InputColumnType.STRING) {
            return columnType;
        }

        if (cellType == CellType.BLANK || cellType == CellType.ERROR) {
            return columnType;
        }

        if (cellType == CellType.STRING) {
            return InputColumnType.STRING;
        }

        if (columnType == InputColumnType.BOOLEAN && cellType != CellType.BOOLEAN) {
            return InputColumnType.DOUBLE;
        }

        if (columnType == InputColumnType.DATE) {
            if (cellType == CellType.NUMERIC && isDateFormatted) {
                return ExcelUtils.isInteger(numericValue)
                        ? InputColumnType.DATE
                        : InputColumnType.DATE_TIME;
            }

            return InputColumnType.DOUBLE;
        }

        if (columnType == InputColumnType.DATE_TIME) {
            return cellType == CellType.NUMERIC && isDateFormatted
                    ? InputColumnType.DATE_TIME
                    : InputColumnType.DOUBLE;
        }

        if (columnType == null) {
            if (cellType == CellType.BOOLEAN) {
                return InputColumnType.BOOLEAN;
            }

            if (cellType == CellType.NUMERIC) {
                if (isDateFormatted) {
                    return ExcelUtils.isInteger(numericValue)
                            ? InputColumnType.DATE
                            : InputColumnType.DATE_TIME;
                }

                return InputColumnType.DOUBLE;
            }
        }

        return columnType;
    }
}
