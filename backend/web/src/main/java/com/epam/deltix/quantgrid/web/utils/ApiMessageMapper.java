package com.epam.deltix.quantgrid.web.utils;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.CompileKey;
import com.epam.deltix.quantgrid.engine.compiler.function.Argument;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.compiler.function.FunctionType;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import com.google.protobuf.util.JsonFormat;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.epam.deltix.proto.Api;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@UtilityClass
public class ApiMessageMapper {
    private static final JsonFormat.Parser PARSER = JsonFormat.parser().ignoringUnknownFields();
    private static final JsonFormat.Printer PRINTER = JsonFormat.printer()
            .omittingInsignificantWhitespace()
            .includingDefaultValueFields();

    public static final FieldKey DIMENSIONAL_SCHEMA_REQUEST_FIELD =
            new FieldKey("__DimensionalSchemaRequestTable", "__formula");

    @SneakyThrows
    public Api.Request toApiRequest(String text) {
        Api.Request.Builder builder = Api.Request.newBuilder();
        PARSER.merge(text, builder);
        return builder.build();
    }

    @SneakyThrows
    public String fromApiRequest(Api.Request request) {
        return PRINTER.print(request);
    }

    @SneakyThrows
    public Api.Response toApiResponse(String text) {
        Api.Response.Builder builder = Api.Response.newBuilder();
        PARSER.merge(text, builder);
        return builder.build();
    }

    @SneakyThrows
    public String fromApiResponse(Api.Response response) {
        return PRINTER.print(response);
    }

    private List<Api.ParsingError> toParsingErrors(List<ParsingError> errors) {
        return errors.stream().map(error -> {
            Api.ParsingError.Builder builder = Api.ParsingError.newBuilder()
                    .setMessage(error.getMessage())
                    .setSource(Api.Source.newBuilder()
                            .setStartLine(error.getLine())
                            .setStartColumn(error.getPosition())
                            .build());

            if (error.getTableName() != null && error.getFieldName() == null) {
                builder.setTableKey(Api.TableKey.newBuilder()
                        .setTable(error.getTableName())
                        .build());
            } else if (error.getTableName() != null && error.getFieldName() != null) {
                builder.setFieldKey(Api.FieldKey.newBuilder()
                        .setTable(error.getTableName())
                        .setField(error.getFieldName())
                        .build());
            }

            return builder.build();
        }).toList();
    }

    public List<Api.CompilationError> toCompilationErrors(Map<ParsedKey, String> compilationErrors) {
        return compilationErrors.entrySet().stream().map(entry -> {
            ParsedKey key = entry.getKey();
            String error = entry.getValue();

            Api.CompilationError.Builder builder = Api.CompilationError.newBuilder()
                    .setMessage(error);

            if (key instanceof TableKey tableKey) {
                builder.setTableKey(Api.TableKey.newBuilder()
                        .setTable(tableKey.table())
                        .build());
            } else if (key instanceof FieldKey fieldKey) {
                builder.setFieldKey(toFieldKey(fieldKey));
            } else if (key instanceof TotalKey totalKey) {
                builder.setTotalKey(toTotalKey(totalKey));
            } else if (key instanceof OverrideKey overrideKey) {
                builder.setOverrideKey(toOverrideKey(overrideKey));
            } else {
                throw new IllegalArgumentException("Unsupported parsed key type: " + key);
            }

            return builder.build();
        }).toList();
    }

    private Api.FieldKey toFieldKey(FieldKey fieldKey) {
        return Api.FieldKey.newBuilder()
                .setTable(fieldKey.table())
                .setField(fieldKey.fieldName())
                .build();
    }

    private Api.TotalKey toTotalKey(TotalKey totalKey) {
        return Api.TotalKey.newBuilder()
                .setTable(totalKey.table())
                .setField(totalKey.field())
                .setNumber(totalKey.number())
                .build();
    }

    private Api.OverrideKey toOverrideKey(OverrideKey overrideKey) {
        return Api.OverrideKey.newBuilder()
                .setTable(overrideKey.table())
                .setField(overrideKey.field())
                .setRow(overrideKey.position())
                .build();
    }

    public Api.FieldInfo toFieldInfo(ParsedKey key, ResultType resultType) {
        Api.FieldInfo.Builder builder = Api.FieldInfo.newBuilder();
        if (key instanceof FieldKey fieldKey) {
            builder.setFieldKey(toFieldKey(fieldKey));
        } else if (key instanceof TotalKey totalKey) {
            builder.setTotalKey(toTotalKey(totalKey));
        } else if (key instanceof OverrideKey overrideKey) {
            builder.setOverrideKey(toOverrideKey(overrideKey));
        } else if (!(key instanceof TableKey)) {
            throw new UnsupportedOperationException("Unsupported key type: " + key);
        }

        if (resultType.tableReference() != null) {
            builder.setType(getTableType(resultType.tableType()));
            builder.setReferenceTableName(resultType.tableReference());
        } else {
            builder.setType(getColumnDataType(resultType.columnType()));
        }

        builder.setIsNested(resultType.isNested());

        return builder.build();
    }

    public List<Api.ParsedSheet> toParsedSheets(List<ParsedSheet> sheets) {
        return sheets.stream().map(sheet ->
                        Api.ParsedSheet.newBuilder()
                                .setName(sheet.name())
                                .addAllParsingErrors(toParsingErrors(sheet.errors()))
                                .build())
                .collect(Collectors.toList());
    }

    public Api.ColumnData toColumnData(ParsedKey key, long start, long end, boolean content,
                                       Table table, String error, ResultType resultType) {

        Api.ColumnData.Builder builder = Api.ColumnData.newBuilder()
                .setStartRow(start)
                .setEndRow(end);

        if (key instanceof FieldKey fieldKey) {
            builder.setFieldKey(Api.FieldKey.newBuilder()
                    .setTable(fieldKey.table())
                    .setField(fieldKey.fieldName())
                    .build());
        } else {
            TotalKey totalKey = (TotalKey) key;
            builder.setTotalKey(Api.TotalKey.newBuilder()
                    .setTable(totalKey.table())
                    .setField(totalKey.field())
                    .setNumber(totalKey.number())
                    .build());
        }

        if (table != null) {
            fillData(content, table, builder);
        }

        if (error != null) {
            builder.setErrorMessage(error);
        }

        if (resultType == null) {
            builder.setType(Api.ColumnDataType.UNKNOWN);
        } else {
            if (resultType.tableReference() != null) {
                builder.setType(getTableType(resultType.tableType()));
                builder.setReferenceTableName(resultType.tableReference());
            } else {
                builder.setType(getColumnDataType(resultType.columnType()));
            }

            builder.setIsNested(resultType.isNested());
        }

        return builder.build();
    }

    private void fillData(boolean content, Table table, Api.ColumnData.Builder builder) {
        Util.verify(table.getColumnCount() == 1);
        Column column = table.getColumn(0);
        int size = Util.toIntSize(column.size());

        if (column instanceof StringColumn strings) {
            for (int i = 0; i < size; i++) {
                String value = strings.get(i);
                builder.addData(Strings.toString(value));
            }
        } else if (column instanceof PeriodSeriesColumn series) {
            for (int i = 0; i < size; i++) {
                PeriodSeries value = series.get(i);
                builder.addData(value == null ? "N/A" : Long.toString(value.getValues().size()));

                if (content) {
                    Api.PeriodSeries.Builder points = Api.PeriodSeries.newBuilder();

                    if (value != null) {
                        Period period = value.getPeriod();

                        for (int j = 0; j < value.getValues().size(); j++) {
                            double date = period.getTimestamp(value.getOffset() + j);
                            double val = value.getValues().get(j);
                            points.putPoints(period.format(date), Doubles.toString(val));
                        }
                    }

                    builder.addPeriodSeries(points.build());
                }
            }
        } else {
            throw new IllegalArgumentException("Unsupported column: " + column.getClass());
        }
    }

    private Api.ColumnDataType getColumnDataType(ColumnType type) {
        return switch (type) {
            case STRING -> Api.ColumnDataType.STRING;
            case DOUBLE -> Api.ColumnDataType.DOUBLE;
            case INTEGER -> Api.ColumnDataType.INTEGER;
            case BOOLEAN -> Api.ColumnDataType.BOOLEAN;
            case DATE -> Api.ColumnDataType.DATE;
            case PERIOD_SERIES -> Api.ColumnDataType.PERIOD_SERIES;
        };
    }

    private Api.ColumnDataType getTableType(ResultType.TableType type) {
        return switch (type) {
            case TABLE -> Api.ColumnDataType.TABLE;
            case INPUT -> Api.ColumnDataType.INPUT;
            case PERIOD_SERIES_POINT -> Api.ColumnDataType.PERIOD_SERIES_POINT;
        };
    }

    public Api.FunctionType getFunctionType(FunctionType type) {
        return switch (type) {
            case CREATE_TABLE -> Api.FunctionType.CREATE_TABLE_FUNCTIONS;
            case AGGREGATIONS -> Api.FunctionType.AGGREGATIONS_FUNCTIONS;
            case MATH -> Api.FunctionType.MATH_FUNCTIONS;
            case LOGICAL -> Api.FunctionType.LOGICAL_FUNCTIONS;
            case TABLE -> Api.FunctionType.TABLE_FUNCTIONS;
            case ARRAY -> Api.FunctionType.ARRAY_FUNCTIONS;
            case LOOKUP -> Api.FunctionType.LOOKUP_FUNCTIONS;
            case DATE -> Api.FunctionType.DATE_FUNCTIONS;
            case TEXT -> Api.FunctionType.TEXT_FUNCTIONS;
            case PERIOD_SERIES -> Api.FunctionType.PERIOD_SERIES_FUNCTIONS;
            case PYTHON -> Api.FunctionType.PYTHON_FUNCTIONS;
            case EVALUATION -> Api.FunctionType.EVALUATION_FUNCTIONS;
        };
    }

    public static Api.Response toCompilationResponse(String requestId,
                                                     List<ParsedSheet> parsedSheets,
                                                     Map<CompileKey, CompiledResult> compiledFields,
                                                     Map<ParsedKey, String> compileErrors) {

        List<Api.FieldInfo> fields = new ArrayList<>();
        compiledFields.forEach((key, value) -> {
            if (key.exploded() && key.overridden() && !key.isTable()) {
                fields.add(toFieldInfo(key.key(), ResultType.toResultType(value)));
            }
        });
        Api.CompileResult compileResult = Api.CompileResult.newBuilder()
                .addAllSheets(toParsedSheets(parsedSheets))
                .addAllCompilationErrors(toCompilationErrors(compileErrors))
                .addAllFieldInfo(fields)
                .build();

        return Api.Response.newBuilder()
                .setId(requestId)
                .setCompileResult(compileResult)
                .build();
    }

    public Api.Function getFunction(Function function) {
        Api.Function.Builder builder = Api.Function.newBuilder()
                .setName(function.name())
                .setDescription(function.description())
                .addAllFunctionType(function.functionTypes().stream()
                        .map(ApiMessageMapper::getFunctionType).toList());

        for (Argument argument : function.arguments()) {
            Api.Argument arg = Api.Argument.newBuilder()
                    .setName(argument.name())
                    .setDescription(argument.description())
                    .setRepeatable(argument.repeatable())
                    .setOptional(argument.optional())
                    .build();

            builder.addArguments(arg);
        }

        return builder.build();
    }
}
