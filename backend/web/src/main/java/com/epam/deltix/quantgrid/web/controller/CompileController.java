package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileKey;
import com.epam.deltix.quantgrid.engine.compiler.Compiler;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.ParsedFormula;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.google.protobuf.util.JsonFormat;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;
import org.epam.deltix.proto.Api;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequiredArgsConstructor
public class CompileController {
    private static final JsonFormat.Printer PRINTER = JsonFormat.printer()
            .omittingInsignificantWhitespace()
            .includingDefaultValueFields();
    private final InputProvider inputProvider;

    @PostMapping(value = "/v1/compile", produces = "application/json")
    public String compile(@RequestBody String body, Principal principal) {
        Api.Request apiRequest = ApiMessageMapper.parseRequest(
                body, Api.Request::getCompileWorksheetsRequest, Api.CompileWorksheetsRequest.class);
        Api.CompileWorksheetsRequest request = apiRequest.getCompileWorksheetsRequest();
        List<ParsedSheet> parsedSheets = parseSheets(request.getWorksheetsMap());
        Compiler compiler = new Compiler(inputProvider, principal);
        Compilation compilation = compiler.compile(parsedSheets, List.of(), false, null);

        Api.Response apiResponse = ApiMessageMapper.toCompilationResponse(apiRequest.getId(), parsedSheets, compilation);
        return formatResponse(apiResponse);
    }

    @PostMapping(value = "/v1/schema", produces = "application/json")
    public String getSchema(@RequestBody String body, Principal principal) {
        Api.Request apiRequest = ApiMessageMapper.parseRequest(
                body, Api.Request::getDimensionalSchemaRequest, Api.DimensionalSchemaRequest.class);
        Api.DimensionalSchemaRequest request = apiRequest.getDimensionalSchemaRequest();

        try {
            Api.DimensionalSchemaResponse schemaResponse = getDimensionalSchemaResponse(request, principal);
            Api.Response apiResponse = Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setDimensionalSchemaResponse(schemaResponse)
                    .build();
            return formatResponse(apiResponse);
        } catch (CompileError error) {
            Api.DimensionalSchemaResponse errorResponse = Api.DimensionalSchemaResponse.newBuilder()
                    .setFormula(request.getFormula())
                    .setErrorMessage(error.getMessage() == null ? error.toString() : error.getMessage())
                    .build();
            Api.Response apiResponse = Api.Response.newBuilder()
                    .setId(apiRequest.getId())
                    .setDimensionalSchemaResponse(errorResponse)
                    .build();
            return formatResponse(apiResponse);
        }
    }

    private Api.DimensionalSchemaResponse getDimensionalSchemaResponse(
            Api.DimensionalSchemaRequest request, Principal principal) {
        ParsedFormula parsedFormula = SheetReader.parseFormula(request.getFormula());
        List<ParsingError> errors = parsedFormula.errors();
        if (!errors.isEmpty()) {
            String message = errors.stream()
                    .map(ParsingError::getMessage)
                    .collect(Collectors.joining(",\n"));
            throw new CompileError(message);
        }

        Compiler compiler = new Compiler(inputProvider, principal);
        List<ParsedSheet> parsedSheets = parseSheets(request.getWorksheetsMap());
        compiler.setSheet(parsedSheets);


        String table = request.getTable();
        CompileContext formulaContext = StringUtils.isBlank(table) ? new CompileContext(compiler)
                : new CompileContext(compiler, CompileKey.tableKey(table));

        CompiledResult result = formulaContext.compileFormula(parsedFormula.formula());

        List<String> fields = List.of();
        List<String> keys = List.of();
        if (result instanceof CompiledTable compiledTable) {
            fields = compiledTable.fields(formulaContext);
            keys = compiledTable.keys(formulaContext);
        }

        ResultType resultType = ResultType.toResultType(result);
        Api.FieldInfo fieldInfo = ApiMessageMapper.toFieldInfo(ApiMessageMapper.DIMENSIONAL_SCHEMA_REQUEST_FIELD,
                null, resultType);
        return Api.DimensionalSchemaResponse.newBuilder()
                .setFormula(request.getFormula())
                .addAllSchema(fields)
                .addAllKeys(keys)
                .setFieldInfo(fieldInfo)
                .build();
    }

    @PostMapping(value = "/v1/functions", produces = "application/json")
    public String getFunctions(@RequestBody String body, Principal principal) {
        Api.Request apiRequest = ApiMessageMapper.parseRequest(body, Api.Request::getFunctionRequest, Api.FunctionRequest.class);
        Api.FunctionRequest request = apiRequest.getFunctionRequest();

        Compiler compiler = new Compiler(inputProvider, principal);
        List<ParsedSheet> parsedSheets = parseSheets(request.getWorksheetsMap());
        compiler.setSheet(parsedSheets);

        List<Api.Function> functions = Stream.concat(
                        compiler.getPythonFunctionList().stream(),
                        Functions.functions().stream())
                .map(ApiMessageMapper::getFunction)
                .toList();

        Api.Response apiResponse = Api.Response.newBuilder()
                .setId(apiRequest.getId())
                .setFunctionResponse(Api.FunctionResponse.newBuilder()
                        .addAllFunctions(functions)
                        .build())
                .build();

        return formatResponse(apiResponse);
    }

    private static List<ParsedSheet> parseSheets(Map<String, String> worksheets) {
        List<ParsedSheet> parsedSheets = new ArrayList<>();
        worksheets.forEach((name, dsl) -> {
            ParsedSheet sheet = SheetReader.parseSheet(name, dsl);
            parsedSheets.add(sheet);
        });
        return parsedSheets;
    }

    @SneakyThrows
    private static String formatResponse(Api.Response response) {
        return PRINTER.print(response);
    }

}
