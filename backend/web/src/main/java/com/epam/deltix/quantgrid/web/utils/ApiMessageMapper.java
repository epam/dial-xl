package com.epam.deltix.quantgrid.web.utils;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.web.model.WorksheetState;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import lombok.experimental.UtilityClass;
import org.epam.deltix.proto.Api;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

@UtilityClass
public class ApiMessageMapper {
    private final JsonFormat.Parser PARSER = JsonFormat.parser().ignoringUnknownFields();

    public Api.Request toApiRequest(String text) throws InvalidProtocolBufferException {
        Api.Request.Builder requestBuilder = Api.Request.newBuilder();

        PARSER.merge(text, requestBuilder);

        return requestBuilder.build();
    }

    public Api.ProjectList toProjectList(Set<String> projects) {
        return Api.ProjectList.newBuilder()
                .addAllProjects(projects)
                .build();
    }

    public Api.ProjectState toProjectState(ProjectContext context, boolean isDeleted) {
        long version = context.getVersion();
        String projectName = context.getProjectName();
        Api.ProjectState.Builder projectStateBuilder = Api.ProjectState.newBuilder()
                .setProjectName(projectName)
                .setVersion(version)
                .setIsDeleted(isDeleted);

        // sheets
        Collection<WorksheetState> worksheets = context.getWorksheets();
        worksheets.forEach(worksheet -> projectStateBuilder.addSheets(
                toWorksheetState(projectName, version, worksheet, Map.of(), isDeleted)));

        return projectStateBuilder.build();
    }

    public Api.WorksheetState toWorksheetState(String projectName, long version, WorksheetState worksheet,
                                               Map<FieldKey, String> compilationErrors, boolean isDeleted) {
        return Api.WorksheetState.newBuilder()
                .setProjectName(projectName)
                .setVersion(version)
                .setSheetName(worksheet.getSheetName())
                .setContent(worksheet.getDsl())
                .setIsDeleted(isDeleted)
                .addAllParsingErrors(toParsingErrors(worksheet))
                .addAllCompilationErrors(toCompilationErrors(compilationErrors))
                .build();
    }

    private List<Api.ParsingError> toParsingErrors(WorksheetState worksheet) {
        return worksheet.getParsedSheet().getErrors().stream()
                .map(error -> {
                            Api.ParsingError.Builder builder = Api.ParsingError.newBuilder()
                                    .setMessage(error.getMessage())
                                    .setLine(error.getLine())
                                    .setPosition(error.getPosition());

                            if (error.getTableName() != null) {
                                builder.setTableName(error.getTableName());
                            }

                            if (error.getFieldName() != null) {
                                builder.setFieldName(error.getFieldName());
                            }

                            return builder.build();
                        }
                )
                .toList();
    }

    private List<Api.CompilationError> toCompilationErrors(Map<FieldKey, String> compilationErrors) {
        return compilationErrors.entrySet().stream().map(entry -> {
            FieldKey field = entry.getKey();
            String error = entry.getValue();

            Api.CompilationError.Builder builder = Api.CompilationError.newBuilder()
                    .setMessage(error)
                    .setTableName(field.tableName());
            if (field.fieldName() != null) {
                builder.setFieldName(field.fieldName());
            }
            return builder.build();
        }).toList();
    }

    // TODO current logic do not handle viewport cache and resend data all the time, rewrite method once needed
    public Api.ViewportState toViewportState() {
        return Api.ViewportState.newBuilder().build();
    }

    public Api.InputMetadataResponse toInputMetadataResponse(Api.InputFile inputFile, InputMetadata metadata) {
        Api.InputMetadataResponse.Builder responseBuilder = Api.InputMetadataResponse.newBuilder()
                .setInput(inputFile);
        metadata.columnTypes()
                .forEach((columnName, columnType) -> responseBuilder.addColumns(Api.ColumnMetadata.newBuilder()
                        .setColumnName(columnName)
                        .setType(getColumnDataType(columnType))
                        .build()));

        return responseBuilder.build();
    }

    public Api.ColumnData toColumnData(String tableName, String fieldName, long start, long end, boolean content,
                                       long version, Table table, String error, ResultType resultType) {

        Api.ColumnData.Builder builder = Api.ColumnData.newBuilder()
                .setTableName(tableName)
                .setColumnName(fieldName)
                .setStartRow(start)
                .setEndRow(end)
                .setVersion(version);

        if (table != null) {
            fillData(content, table, builder);
        }

        if (error != null) {
            builder.setErrorMessage(error);
        }

        if (table == null && error == null) {
            builder.setIsPending(true);
        }

        if (resultType == null) {
            builder.setType(Api.ColumnDataType.UNKNOWN);
        } else {
            if (resultType.tableReference() != null) {
                builder.setType(Api.ColumnDataType.TABLE);
                builder.setReferenceTableName(resultType.tableReference());
            } else {
                builder.setType(getColumnDataType(resultType.columnType()));
            }

            builder.setIsNested(resultType.isNested());
        }

        return builder.build();
    }

    private static void fillData(boolean content, Table table, Api.ColumnData.Builder builder) {
        Util.verify(table.getColumnCount() == 1);
        Column column = table.getColumn(0);
        int size = Util.toIntSize(column.size());

        if (column instanceof StringColumn strings) {
            for (int i = 0; i < size; i++) {
                String value = strings.get(i);
                builder.addData(value == null ? "N/A" : value);
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
                            points.putPoints(period.format(date), Util.isNa(val) ? "N/A" : Double.toString(val));
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
}
