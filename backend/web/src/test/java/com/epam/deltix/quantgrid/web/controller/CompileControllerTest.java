package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.google.protobuf.util.JsonFormat;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@WebMvcTest(CompileController.class)
class CompileControllerTest {
    private static final String TEST_ID = UUID.randomUUID().toString();
    private static final JsonFormat.Parser PARSER = JsonFormat.parser();
    private static final JsonFormat.Printer PRINTER = JsonFormat.printer();

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InputProvider inputProvider;

    @Test
    void testCompile() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCompileWorksheetsRequest(Api.CompileWorksheetsRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  [a] = 1
                                  [b] = INDEX([a])
                                
                                table
                                """)))
                .build();
        Api.Response expected = Api.Response.newBuilder()
                .setId(TEST_ID)
                .setCompileResult(Api.CompileResult.newBuilder()
                        .addSheets(Api.ParsedSheet.newBuilder()
                                .setName("Test")
                                .addParsingErrors(Api.ParsingError.newBuilder()
                                        .setMessage("missing {IDENTIFIER, MULTI_WORD_TABLE_IDENTIFIER} at '<EOF>'")
                                        .setSource(Api.Source.newBuilder()
                                                .setStartLine(6)
                                                .setStartColumn(1)))
                                .addParsingErrors(Api.ParsingError.newBuilder()
                                        .setMessage("Missing table name")
                                        .setSource(Api.Source.newBuilder()
                                                .setStartLine(6)
                                                .setStartColumn(1))))
                        .addFieldInfo(Api.FieldInfo.newBuilder()
                                .setFieldKey(Api.FieldKey.newBuilder()
                                        .setTable("A")
                                        .setField("a"))
                                .setType(Api.ColumnDataType.INTEGER))
                        .addCompilationErrors(Api.CompilationError.newBuilder()
                                .setFieldKey(Api.FieldKey.newBuilder()
                                        .setTable("A")
                                        .setField("b"))
                                .setMessage("Function INDEX expects 2 arguments - \"table\" and \"index\", but 1 were provided")))
                .build();

        Api.Response actual = sendRequest("/v1/compile", request);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testSchema() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setDimensionalSchemaRequest(Api.DimensionalSchemaRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  key [a] = 1
                                  [b] = 2
                                """))
                        .setFormula("A"))
                .build();
        Api.Response expected = Api.Response.newBuilder()
                .setId(TEST_ID)
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setFormula("A")
                        .addAllSchema(List.of("a", "b"))
                        .addKeys("a")
                        .setFieldInfo(Api.FieldInfo.newBuilder()
                                .setFieldKey(Api.FieldKey.newBuilder()
                                        .setTable("__DimensionalSchemaRequestTable")
                                        .setField("__formula"))
                                .setType(Api.ColumnDataType.TABLE)
                                .setIsNested(true)
                                .setReferenceTableName("A")))
                .build();

        Api.Response actual = sendRequest("/v1/schema", request);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFunctions() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setFunctionRequest(Api.FunctionRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", """
                                ```python
                                def test_function(a: int):
                                    return a
                                ```
                                """)))
                .build();
        Api.Function pythonFunction = Api.Function.newBuilder()
                .setName("TEST_FUNCTION")
                .addArguments(Api.Argument.newBuilder()
                        .setName("a")
                        .setDescription("test_function"))
                .setDescription("python function")
                .addFunctionType(Api.FunctionType.PYTHON_FUNCTIONS)
                .build();

        Api.Response actual = sendRequest("/v1/functions", request);

        assertThat(actual.getFunctionResponse().getFunctionsList())
                .hasSizeGreaterThan(1)
                .contains(pythonFunction);
    }

    private Api.Response sendRequest(String endpoint, Api.Request request) throws Exception {
        String response = mockMvc.perform(post(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRINTER.print(request))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Api.Response.Builder builder = Api.Response.newBuilder();
        PARSER.merge(response, builder);
        return builder.build();
    }
}