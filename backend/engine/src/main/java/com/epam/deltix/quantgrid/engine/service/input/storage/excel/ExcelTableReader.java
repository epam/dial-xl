package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.ints.Int2IntMap;
import it.unimi.dsi.fastutil.ints.Int2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;

import java.util.Arrays;
import java.util.List;


public class ExcelTableReader implements ExcelDataConsumer {
    private final StylesTable stylesTable;
    private final SharedStrings sharedStrings;
    private final int startRow;
    private final int endRow;
    private final List<ColumnMetadata> columns;
    private final ObjectArrayList<String>[] stringArrays;
    private final DoubleArrayList[] doubleArrays;
    private final Int2IntMap positions;

    public ExcelTableReader(
            StylesTable stylesTable,
            SharedStrings sharedStrings,
            int startRow,
            int endRow,
            List<ColumnMetadata> columns) {
        this.stylesTable = stylesTable;
        this.sharedStrings = sharedStrings;
        this.startRow = startRow;
        this.endRow = endRow;
        this.columns = columns;

        @SuppressWarnings("unchecked")
        ObjectArrayList<String>[] stringArrays = new ObjectArrayList[columns.size()];
        DoubleArrayList[] doubleArrays = new DoubleArrayList[columns.size()];
        Int2IntMap positions = new Int2IntOpenHashMap();
        int size = endRow - startRow;
        for (int i = 0; i < columns.size(); ++i) {
            ColumnMetadata column = columns.get(i);
            positions.put(column.index(), i);
            if (column.type() == InputColumnType.STRING) {
                String[] strings = new String[size];
                Arrays.fill(strings, Strings.EMPTY);
                stringArrays[i] = ObjectArrayList.wrap(strings);
            } else {
                double[] doubles = new double[size];
                Arrays.fill(doubles, Doubles.EMPTY);
                doubleArrays[i] = DoubleArrayList.wrap(doubles);
            }
        }

        this.stringArrays = stringArrays;
        this.doubleArrays = doubleArrays;
        this.positions = positions;
    }

    @Override
    public boolean shouldConsumeRow(int row) {
        return row >= startRow;
    }

    @Override
    public boolean shouldConsumeColumn(int column) {
        return positions.containsKey(column);
    }

    @Override
    public boolean shouldFinish(int row) {
        return row >= endRow;
    }

    @Override
    public void consume(CharSequence value, int row, int column, String type, String style) {
        CellType cellType = ExcelUtils.parseCellType(type);
        boolean isDateFormatted = cellType == CellType.NUMERIC
                && ExcelUtils.isDateFormatted(stylesTable, style, type);
        double numericValue = cellType == CellType.NUMERIC || cellType == CellType.BOOLEAN
                ? Double.parseDouble(value.toString())
                : 0.0;
        int position = positions.get(column);
        ColumnMetadata columnMetadata = columns.get(position);
        if (columnMetadata.type() == InputColumnType.STRING) {
            String formatted = ExcelUtils.formatCellValue(
                    cellType,
                    numericValue,
                    isDateFormatted,
                    ExcelUtils.decodeString(sharedStrings, type, value));
            stringArrays[position].set(row - startRow, formatted);
        } else {
            double normalized = switch (cellType) {
                case NUMERIC, BOOLEAN -> numericValue;
                default -> Doubles.ERROR_NA;
            };
            doubleArrays[position].set(row - startRow, normalized);
        }
    }

    public Object[] result() {
        return columns.stream()
                .map(column -> {
                    int position = positions.get(column.index());
                    return column.type() == InputColumnType.STRING
                            ? stringArrays[position]
                            : doubleArrays[position];
                })
                .toArray();
    }
}
