package com.epam.deltix.quantgrid.web.utils;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.function.Argument;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.compiler.function.FunctionType;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.CurrencyFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.DateFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.NumberFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.PercentageFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ScientificFormat;
import com.epam.deltix.quantgrid.engine.node.Trace;
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
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.epam.deltix.proto.Api;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
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

    public List<Api.CompilationError> toCompilationErrors(Map<ParsedKey, CompileError> compilationErrors) {
        return compilationErrors.entrySet().stream().map(entry -> {
            ParsedKey key = entry.getKey();
            String error = entry.getValue().getMessage();

            Api.CompilationError.Builder builder = Api.CompilationError.newBuilder()
                    .setMessage(error);

            if (key instanceof TableKey tableKey) {
                builder.setTableKey(toTableKey(tableKey));
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

    private Api.TableKey toTableKey(TableKey tableKey) {
        return Api.TableKey.newBuilder()
                .setTable(tableKey.table())
                .build();
    }

    public Api.FieldInfo toFieldInfo(ParsedKey key, Set<ParsedKey> references, String hash, ResultType resultType) {
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

        if (resultType.tableType() != null) {
            builder.setType(getTableType(resultType.tableType()));
            if (resultType.tableType() == ResultType.TableType.TABLE_REFERENCE) {
                builder.setReferenceTableName(resultType.tableName());
            }
        } else {
            builder.setType(getColumnDataType(resultType.columnType()));
        }

        builder.setIsNested(resultType.isNested());
        if (hash != null) {
            builder.setHash(hash);
        }
        if (resultType.format() != null) {
            builder.setFormat(toColumnFormat(resultType.format()));
        }
        builder.addAllReferences(references.stream()
                .map(ApiMessageMapper::toReference)
                .toList());
        return builder.build();
    }

    private static Api.Reference toReference(ParsedKey key) {
        Api.Reference.Builder builder = Api.Reference.newBuilder();
        if (key instanceof FieldKey fieldKey) {
            builder.setFieldKey(toFieldKey(fieldKey));
        } else if (key instanceof TotalKey totalKey) {
            builder.setTotalKey(toTotalKey(totalKey));
        } else if (key instanceof TableKey tableKey) {
            builder.setTableKey(toTableKey(tableKey));
        } else {
            throw new IllegalArgumentException("Unsupported reference key: " + key);
        }
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

    public Api.ColumnData toColumnData(ParsedKey key, long start, long end, boolean content, boolean raw,
                                       Table table, String error, ResultType resultType) {

        Api.ColumnData.Builder builder = Api.ColumnData.newBuilder()
                .setStartRow(start)
                .setEndRow(end)
                .setTotalRows(table == null ? 0 : table.size());

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
            fillData(table, start, end, content, builder);
        }

        if (error != null) {
            builder.setErrorMessage(error);
        }

        if (resultType == null) {
            builder.setType(Api.ColumnDataType.UNKNOWN);
        } else {
            if (resultType.tableType() != null) {
                builder.setType(getTableType(resultType.tableType()));
                if (resultType.tableType() == ResultType.TableType.TABLE_REFERENCE) {
                    builder.setReferenceTableName(resultType.tableName());
                }
            } else {
                builder.setType(getColumnDataType(resultType.columnType()));
                if (resultType.format() != null && raw) {
                    builder.setFormat(toColumnFormat(resultType.format()));
                }
                builder.setIsRaw(raw);
            }

            builder.setIsNested(resultType.isNested());
        }

        return builder.build();
    }

    private Api.ColumnFormat toColumnFormat(ColumnFormat format) {
        if (format instanceof GeneralFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_GENERAL)
                    .setGeneralArgs(Api.GeneralFormatArgs.newBuilder().build())
                    .build();
        }

        if (format instanceof BooleanFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_BOOLEAN)
                    .setBooleanArgs(Api.BooleanFormatArgs.newBuilder().build())
                    .build();
        }

        if (format instanceof CurrencyFormat currencyFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_CURRENCY)
                    .setCurrencyArgs(Api.CurrencyFormatArgs.newBuilder()
                            .setSymbol(currencyFormat.symbol())
                            .setUseThousandsSeparator(currencyFormat.useThousandsSeparator())
                            .setFormat(currencyFormat.format())
                            .build())
                    .build();
        }

        if (format instanceof DateFormat dateFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_DATE)
                    .setDateArgs(Api.DateFormatArgs.newBuilder()
                            .setPattern(dateFormat.pattern())
                            .build())
                    .build();
        }

        if (format instanceof NumberFormat numberFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_NUMBER)
                    .setNumberArgs(Api.NumberFormatArgs.newBuilder()
                            .setUseThousandsSeparator(numberFormat.useThousandsSeparator())
                            .setFormat(numberFormat.format())
                            .build())
                    .build();
        }

        if (format instanceof PercentageFormat percentageFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_PERCENTAGE)
                    .setPercentageArgs(Api.PercentageFormatArgs.newBuilder()
                            .setFormat(percentageFormat.format())
                            .setUseThousandsSeparator(percentageFormat.useThousandsSeparator())
                            .build())
                    .build();
        }

        if (format instanceof ScientificFormat scientificFormat) {
            return Api.ColumnFormat.newBuilder()
                    .setType(Api.FormatType.FORMAT_TYPE_SCIENTIFIC)
                    .setScientificArgs(Api.ScientificFormatArgs.newBuilder()
                            .setFormat(scientificFormat.format())
                            .build())
                    .build();
        }

        throw new IllegalStateException("Unsupported format type: " + format.getClass().getSimpleName());
    }

    private void fillData(Table table, long start, long end, boolean content, Api.ColumnData.Builder builder) {
        Util.verify(table.getColumnCount() == 1);
        Column column = table.getColumn(0);
        long size = column.size();
        start = Math.min(start, size);
        end = Math.min(end, size);

        if (column instanceof StringColumn strings) {
            for (long i = start; i < end; i++) {
                String value = strings.get(i);
                builder.addData(Strings.toString(value));
            }
        } else if (column instanceof PeriodSeriesColumn series) {
            for (long i = start; i < end; i++) {
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
            case PERIOD_SERIES -> Api.ColumnDataType.PERIOD_SERIES;
            case STRUCT -> throw new IllegalArgumentException("Not expected: " + type);
        };
    }

    private Api.ColumnDataType getTableType(ResultType.TableType type) {
        return (type == ResultType.TableType.TABLE_REFERENCE) ? Api.ColumnDataType.TABLE_REFERENCE
                : Api.ColumnDataType.TABLE_VALUE;
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

    public Api.Index toIndex(FieldKey key, String error) {
        Api.Index.Builder builder = Api.Index.newBuilder()
                .setKey(toFieldKey(key));
        if (error == null) {
            return builder.build();
        }

        return builder.setErrorMessage(error).build();
    }

    public static Api.Response toCompilationResponse(String requestId,
                                                     List<ParsedSheet> parsedSheets,
                                                     Compilation compilation) {

        List<Api.FieldInfo> fields = new ArrayList<>();
        compilation.results().forEach((key, value) -> {
            String hash = compilation.hashes().get(key);
            Set<ParsedKey> references = compilation.references().getOrDefault(key, Set.of());
            fields.add(toFieldInfo(key, references, hash, ResultType.toResultType(value)));
        });
        List<Api.FieldKey> indices = compilation.indices().stream()
                .map(ApiMessageMapper::toFieldKey)
                .toList();
        Api.CompileResult compileResult = Api.CompileResult.newBuilder()
                .addAllSheets(toParsedSheets(parsedSheets))
                .addAllCompilationErrors(toCompilationErrors(compilation.errors()))
                .addAllFieldInfo(fields)
                .addAllIndices(indices)
                .build();

        return Api.Response.newBuilder()
                .setId(requestId)
                .setCompileResult(compileResult)
                .build();
    }

    public static Api.Profile toProfile(Trace trace, long startedAt, long stoppedAt, boolean completed) {
        Api.Profile.Builder builder = Api.Profile.newBuilder();
        ParsedKey key = trace.key();

        if (key instanceof TableKey table) {
            builder.setTableKey(toTableKey(table));
        } else if (key instanceof FieldKey field) {
            builder.setFieldKey(toFieldKey(field));
        } else if (key instanceof TotalKey total) {
            builder.setTotalKey(toTotalKey(total));
        } else if (key instanceof OverrideKey override) {
            builder.setOverrideKey(toOverrideKey(override));
        } else {
            throw new IllegalArgumentException("Unsupported key: " + key);
        }

        builder.setSource(Api.Source.newBuilder()
                .setSheet(trace.sheet())
                .setStartIndex(trace.start())
                .setStopIndex(trace.end())
                .build());

        builder.setType(trace.type() == Trace.Type.COMPUTE ? Api.ExecutionType.COMPUTE : Api.ExecutionType.INDEX);

        if (completed) {
            builder.setStatus(Api.ExecutionStatus.COMPLETED);
            builder.setStartedAt(startedAt);
            builder.setStoppedAt(stoppedAt);
            builder.setExecutionTime(stoppedAt - startedAt);
        } else {
            builder.setStatus(Api.ExecutionStatus.RUNNING);
            builder.setStartedAt(startedAt);
            builder.setExecutionTime(System.currentTimeMillis() - startedAt);
        }

        return builder.build();
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

    public Set<ParsedKey> toParsedKeys(Api.CancelRequest request) {
        return request.getCancellationKeysList()
                .stream()
                .map(key -> {
                    if (key.hasFieldKey()) {
                        return new FieldKey(key.getFieldKey().getTable(), key.getFieldKey().getField());
                    }

                    return new TotalKey(key.getTotalKey().getTable(), key.getTotalKey().getField(),
                            key.getTotalKey().getNumber());
                }).map(key -> (ParsedKey) key)
                .collect(Collectors.toSet());
    }

    public static Collection<Api.CancelKey> toCancelKeys(Collection<ParsedKey> keys) {
        return keys.stream().map(key -> {
            Api.CancelKey.Builder builder = Api.CancelKey.newBuilder();

            if (key instanceof FieldKey field) {
                builder.setFieldKey(Api.FieldKey.newBuilder()
                        .setTable(field.table())
                        .setField(field.fieldName())
                        .build());
            } else if (key instanceof TotalKey total) {
                builder.setTotalKey(Api.TotalKey.newBuilder()
                        .setTable(total.table())
                        .setField(total.field())
                        .setNumber(total.number())
                        .build());
            } else {
                throw new IllegalArgumentException("Unsupported key: " + key);
            }

            return builder.build();
        }).toList();
    }

    public static List<Viewport> toViewports(List<Api.Viewport> viewports) {
        List<Viewport> viewPorts = new ArrayList<>();
        for (Api.Viewport viewport : viewports) {
            Viewport view = toViewport(viewport);
            viewPorts.add(view);
        }
        return viewPorts;
    }

    public static Viewport toViewport(Api.Viewport viewport) {
        ParsedKey key = viewport.hasFieldKey()
                ? new FieldKey(viewport.getFieldKey().getTable(), viewport.getFieldKey().getField())
                : new TotalKey(viewport.getTotalKey().getTable(), viewport.getTotalKey().getField(),
                viewport.getTotalKey().getNumber());

        return new Viewport(key, ComputationType.REQUIRED,
                viewport.getStartRow(), viewport.getEndRow(),
                viewport.getIsContent(), viewport.getIsRaw());
    }

    public <T extends Message> Api.Request parseRequest(
            String body, java.util.function.Function<Api.Request, T> getter, Class<T> type) {
        try {
            Api.Request.Builder builder = Api.Request.newBuilder();
            PARSER.merge(body, builder);

            if (!builder.hasId()) {
                builder.setId(UUID.randomUUID().toString().replace("-", ""));
            }

            Api.Request request = builder.build();
            Objects.requireNonNull(getter.apply(request));
            return request;
        } catch (InvalidProtocolBufferException | NullPointerException e) {
            throw new IllegalArgumentException("Expected Api.Request with %s".formatted(type.getSimpleName()), e);
        }
    }
}
