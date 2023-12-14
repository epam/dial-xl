package com.epam.deltix.quantgrid.engine.spark;

import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import lombok.Value;
import lombok.experimental.UtilityClass;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.Metadata;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

import java.util.Arrays;
import java.util.List;

@UtilityClass
public class SchemaUtil {

    private static final DataType PERIOD_SERIES_DATA_TYPE = new StructType(
            new StructField[] {
                    DataTypes.createStructField("offset", DataTypes.DoubleType, false),
                    DataTypes.createStructField("period", DataTypes.StringType, false),
                    DataTypes.createStructField("values",
                            DataTypes.createArrayType(DataTypes.DoubleType, false), false)
            });

    public static ColumnType of(DataType dataType) {
        if (dataType == DataTypes.DoubleType) {
            return ColumnType.DOUBLE;
        } else if (dataType == DataTypes.StringType) {
            return ColumnType.STRING;
        } else if (PERIOD_SERIES_DATA_TYPE.equals(dataType)) {
            return ColumnType.PERIOD_SERIES;
        } else {
            throw new IllegalStateException(dataType + " is not supported");
        }
    }

    public static DataType sparkDataType(ColumnType columnType) {
        return switch (columnType) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> DataTypes.DoubleType;
            case STRING -> DataTypes.StringType;
            case PERIOD_SERIES -> PERIOD_SERIES_DATA_TYPE;
        };
    }

    public static boolean isNullable(ColumnType columnType) {
        return switch (columnType) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> false;
            case STRING, PERIOD_SERIES -> true;
        };
    }

    public static StructType toStructType(List<ColumnPartition> columns) {
        int size = columns.size();
        StructField[] fields = new StructField[size];
        for (int position = 0; position < size; position++) {
            ColumnPartition column = columns.get(position);

            ColumnType type = column.getType();
            fields[position] = new StructField(
                    column.getName(), sparkDataType(type), isNullable(type), Metadata.empty());
        }
        return new StructType(fields);
    }

    public static ColumnType[] toColumnTypes(StructType schema) {
        return Arrays.stream(schema.fields())
                .map(field -> of(field.dataType()))
                .toArray(ColumnType[]::new);
    }

    public static TypedPositions groupColumnsByType(List<ColumnPartition> columns) {
        ColumnType[] columnTypes = columns.stream().map(ColumnPartition::getType).toArray(ColumnType[]::new);
        return groupTypes(columnTypes);
    }

    public static TypedPositions groupTypes(ColumnType[] columns) {
        IntArrayList doubles = new IntArrayList();
        IntArrayList strings = new IntArrayList();
        IntArrayList periodSeries = new IntArrayList();

        for (int index = 0; index < columns.length; index++) {
            ColumnType type = columns[index];

            switch (type) {
                case DOUBLE -> doubles.add(index);
                case STRING -> strings.add(index);
                case PERIOD_SERIES -> periodSeries.add(index);
            }
        }

        return new TypedPositions(doubles.toIntArray(), strings.toIntArray(), periodSeries.toIntArray());
    }

    @Value
    public static class TypedPositions {
        int[] doubles;
        int[] strings;
        int[] periodSeries;
    }
}
