package com.epam.quantgrid.input.jdbc;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import com.epam.quantgrid.input.api.DataRow;
import com.epam.quantgrid.input.api.DataStream;
import lombok.extern.slf4j.Slf4j;

import java.sql.Date;
import java.sql.JDBCType;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

@Slf4j
public class JdbcStream implements DataStream {
    private final AutoCloseable resource;
    private final List<ColumnType> types;
    private final DataRow row;
    private final ResultSet set;
    private final JDBCType[] jdbcTypes;
    private final Calendar calendar;
    private boolean closed;

    public JdbcStream(AutoCloseable resource, List<ColumnType> types, ResultSet set) throws SQLException {
        this.resource = resource;
        this.set = set;
        this.row = new DataRow(types);
        this.types = types;
        ResultSetMetaData metaData = set.getMetaData();
        if (types.size() != metaData.getColumnCount()) {
            throw new IllegalArgumentException("Schema columns count does not match ResultSet columns count");
        }
        this.jdbcTypes = getJdbcTypes(metaData);
        this.calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
    }

    @Override
    public DataRow next() throws Exception {
        if (closed) {
            return null;
        }

        try {
            if (!set.next()) {
                close();
                return null;
            }

            for (int i = 0; i < row.size(); i++) {
                ColumnType columnType = types.get(i);
                switch (columnType) {
                    case STRING -> {
                        String value = set.getString(i + 1);
                        row.setString(i, value == null ? Strings.ERROR_NA : value);
                    }
                    case DOUBLE -> {
                        double value = parseDouble(jdbcTypes[i], i + 1);
                        row.setDouble(i, value);
                    }
                    default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
                }
            }

            return row;
        } catch (Throwable e) {
            close();
            throw e;
        }
    }

    private double parseDouble(JDBCType type, int index) throws SQLException {
        return switch (type) {
            case DATE -> {
                Date date = set.getDate(index, calendar);
                yield set.wasNull() ? Doubles.ERROR_NA : Dates.fromEpochMillis(date.getTime());
            }
            case TIMESTAMP -> {
                Timestamp timestamp = set.getTimestamp(index, calendar);
                yield set.wasNull() ? Doubles.ERROR_NA : Dates.fromEpochMillis(timestamp.getTime());
            }
            case BIT, BOOLEAN -> {
                boolean bool = set.getBoolean(index);
                yield set.wasNull() ? Doubles.ERROR_NA : bool ? 1.0 : 0.0;
            }
            case TINYINT, SMALLINT, INTEGER, BIGINT, REAL, FLOAT, DOUBLE, NUMERIC, DECIMAL -> {
                double number = set.getDouble(index);
                yield set.wasNull() ? Doubles.ERROR_NA : number;
            }
            default -> throw new UnsupportedOperationException("Unsupported type: " + type);
        };
    }

    private static JDBCType[] getJdbcTypes(ResultSetMetaData metaData) throws SQLException {
        JDBCType[] types = new JDBCType[metaData.getColumnCount()];
        for (int i = 0; i < types.length; i++) {
            types[i] = JDBCType.valueOf(metaData.getColumnType(i + 1));
        }
        return types;
    }

    @Override
    public void close() {
        if (!closed) {
            try (var resources = resource) {
                closed = true;
            } catch (Throwable error) {
                log.warn("Failed to close jdbc connection", error);
            }
        }
    }
}