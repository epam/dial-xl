package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.DatasetUtil;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.spark.ScalaUtil;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.ParserUtils;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.objects.StaticInvoke;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.unsafe.types.UTF8String;
import org.jetbrains.annotations.Nullable;

import java.security.Principal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SparkInputProvider implements InputProvider {

    private static final Map<String, String> CSV_OPTIONS = Map.of(
            "sep", ",",
            "enforceSchema", "false",
            "header", "true",
            "timeZone", "UTC",
            "mode", "PERMISSIVE",

            // make Spark's CSV parser RFC-4180 complaint: SPARK-22236
            "quote", "\"",
            "escape", "\""
    );

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        throw new UnsupportedOperationException("SparkInputProvider does not support reading metadata");
    }

    @Override
    public SparkValue readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        // ensure s3a file system is used for reading
        String path = metadata.path().replace("s3://", "s3a://");

        Dataset<Row> rows = switch (metadata.type()) {
            case CSV -> readCsv(path, readColumns, metadata.columnTypes());
        };

        return new SparkDatasetTable(rows);
    }

    @Override
    public String name() {
        return "Spark";
    }

    private Dataset<Row> readCsv(
            String path,
            List<String> readColumns,
            LinkedHashMap<String, ColumnType> columnTypes) {

        List<StructField> sourceFields = columnTypes.entrySet().stream()
                .map(columnType -> {
                    String name = columnType.getKey();
                    DataType type = csvReadType(columnType.getValue());
                    return DataTypes.createStructField(name, type, true); // initially all fields are nullable
                }).toList();

        // has to provide full schema of the source, required schema is pushed-down later by Catalyst
        StructType sourceSchema = DataTypes.createStructType(sourceFields);
        Dataset<Row> csv = Spark.session().read().schema(sourceSchema).options(CSV_OPTIONS).csv(path);

        // parsing and preprocessing of the read columns only to conform to the data spec
        Column[] readCols = convertReadColumns(readColumns, columnTypes, sourceSchema, csv);

        return csv.select(readCols);
    }

    private Column[] convertReadColumns(List<String> readColumns,
                                        LinkedHashMap<String, ColumnType> sourceTypes,
                                        StructType sourceSchema,
                                        Dataset<Row> csv) {

        List<Column> readCols = new ArrayList<>(readColumns.size());

        for (String readColumn : readColumns) {

            StructField field = sourceSchema.apply(readColumn);
            DataType fieldType = field.dataType();
            ColumnType originalType = sourceTypes.get(readColumn);

            Column col = DatasetUtil.escapedCol(csv, field.name());

            if (originalType == ColumnType.BOOLEAN) {
                Util.verify(fieldType == DataTypes.StringType);
                readCols.add(parseBoolean(col).as(readColumn));
            } else if (originalType == ColumnType.DATE) {
                Util.verify(fieldType == DataTypes.StringType);
                readCols.add(parseDate(col).as(readColumn));
            } else if (fieldType == DataTypes.DoubleType) {
                // ensure Double.NaN instead of null
                readCols.add(functions.coalesce(col, functions.lit(Doubles.ERROR_NA)).as(readColumn));
            } else {
                readCols.add(col);
            }
        }

        return readCols.toArray(Column[]::new);
    }

    /**
     * Based on the inferred type we output corresponding Spark type.
     * If Spark parsing is not suitable - we will return StringType to parse it manually later.
     */
    private static DataType csvReadType(ColumnType calcType) {
        return switch (calcType) {
            case STRING -> DataTypes.StringType;
            case DOUBLE, INTEGER -> DataTypes.DoubleType;
            case BOOLEAN, DATE -> DataTypes.StringType; // handle parsing later
            default -> throw new IllegalArgumentException("Unsupported column type " + calcType);
        };
    }

    private Column parseDate(Column source) {
        StaticInvoke expr = new StaticInvoke(
                SparkInputProvider.class,
                DataTypes.DoubleType, // return type
                "parseDate",
                ScalaUtil.seq(source.expr()),
                ScalaUtil.seq(DataTypes.StringType), // input type
                false, // should parse null as well
                true,
                true
        );
        return new Column(expr);
    }

    public static double parseDate(@Nullable UTF8String utf8) {
        String string = (utf8 == null) ? null : utf8.toString();
        return Dates.from(string);
    }

    private Column parseBoolean(Column source) {
        StaticInvoke expr = new StaticInvoke(
                SparkInputProvider.class,
                DataTypes.DoubleType, // return type
                "parseBoolean",
                ScalaUtil.seq(source.expr()),
                ScalaUtil.seq(DataTypes.StringType), // input types
                false, // should parse null as well
                true,
                true
        );
        return new Column(expr);
    }

    public static double parseBoolean(@Nullable UTF8String utf8) {
        String string = (utf8 == null) ? null : utf8.toString();
        return ParserUtils.parseBoolean(string);
    }
}
