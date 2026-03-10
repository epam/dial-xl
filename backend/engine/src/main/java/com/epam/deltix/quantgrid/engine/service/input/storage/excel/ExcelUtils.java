package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.DateFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.SpreadsheetVersion;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.AreaReference;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.xml.sax.Attributes;
import org.xml.sax.SAXParseException;

import java.util.List;

@UtilityClass
public class ExcelUtils {
    private static final Formatter DATE_FORMATTER = DateFormat.DEFAULT_DATE_FORMAT.createFormatter();
    private static final Formatter DATE_TIME_FORMATTER = DateFormat.DEFAULT_DATE_TIME_FORMAT.createFormatter();
    private static final Formatter GENERAL_FORMATTER = GeneralFormat.INSTANCE.createFormatter();
    private static final Formatter BOOLEAN_FORMATTER = BooleanFormat.INSTANCE.createFormatter();
    private static final SpreadsheetVersion SPREADSHEET_VERSION = SpreadsheetVersion.EXCEL2007;

    public int readRowIndex(Attributes attributes, int currentRowIndex) throws SAXParseException {
        String r = attributes.getValue("r");
        if (r == null) {
            return currentRowIndex + 1;
        }

        int rowIndex = Integer.parseInt(r) - 1;
        if (rowIndex <= currentRowIndex) {
            throw new SAXParseException("Row indices should be in increasing order", null);
        }
        return rowIndex;
    }

    public int readColIndex(Attributes attributes, int currentColIndex) throws SAXParseException {
        String r = attributes.getValue("r");
        if (r == null) {
            return currentColIndex + 1;
        }

        int colIndex = new CellReference(r).getCol();
        if (colIndex <= currentColIndex) {
            throw new SAXParseException("Column indices should be in increasing order", null);
        }
        return colIndex;
    }

    public boolean isDateFormatted(StylesTable stylesTable, String styleAttr, String typeAttr) {
        if ("d".equals(typeAttr)) {
            return true;
        }

        if (stylesTable == null) {
            return false;
        }

        if (StringUtils.isBlank(styleAttr)) {
            return false;
        }

        int styleIndex = Integer.parseInt(styleAttr);
        XSSFCellStyle style = stylesTable.getStyleAt(styleIndex);
        if (style == null) {
            return false;
        }

        return DateUtil.isADateFormat(style.getDataFormat(), style.getDataFormatString());
    }

    public <T> void align(List<T> list, int size) {
        for (int i = list.size(); i <= size; ++i) {
            list.add(null);
        }
    }

    public String formatCellValue(
            CellType cellType, double numericValue, boolean isDateFormatted, CharSequence stringValue) {
        if (cellType == CellType.STRING) {
            return stringValue.toString();
        }

        if (cellType == CellType.NUMERIC) {
            if (isDateFormatted) {
                return isInteger(numericValue)
                        ? DATE_FORMATTER.apply(numericValue)
                        : DATE_TIME_FORMATTER.apply(numericValue);
            }
            return GENERAL_FORMATTER.apply(numericValue);
        }

        if (cellType == CellType.BOOLEAN) {
            return BOOLEAN_FORMATTER.apply(numericValue);
        }

        return Strings.ERROR_NA;
    }

    public CharSequence decodeString(SharedStrings sharedStrings, String typeAttr, CharSequence raw) {
        if ("s".equals(typeAttr)) {
            int idx = Integer.parseInt(raw.toString());
            return sharedStrings.getItemAt(idx).getString();
        }
        return raw;
    }

    public CellType parseCellType(String typeAttr) {
        if (typeAttr == null) {
            return CellType.NUMERIC;
        }

        return switch (typeAttr) {
            case "s", "str", "inlineStr" -> CellType.STRING;
            case "b" -> CellType.BOOLEAN;
            case "e" -> CellType.ERROR;
            default -> CellType.NUMERIC;
        };
    }

    public boolean isInteger(double value) {
        return value == Math.floor(value);
    }

    public Range refToRange(String ref) {
        AreaReference areaReference = new AreaReference(ref, SPREADSHEET_VERSION);
        CellReference startRef = areaReference.getFirstCell();
        CellReference endRef = areaReference.getLastCell();
        return new Range(
                startRef.getRow(),
                endRef.getRow() + 1,
                startRef.getCol(),
                endRef.getCol() + 1);
    }

    public Range maxRange() {
        return new Range(0, SPREADSHEET_VERSION.getMaxRows(), 0, SPREADSHEET_VERSION.getMaxColumns());
    }
}
