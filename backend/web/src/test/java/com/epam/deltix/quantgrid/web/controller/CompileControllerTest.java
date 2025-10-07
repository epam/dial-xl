package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@WebMvcTest(CompileController.class)
class CompileControllerTest {
    private static final String TEST_ID = UUID.randomUUID().toString();

    @TestConfiguration
    public static class Configuration {
        @Bean
        public InputProvider dialInputProvider(DialFileApi fileApi) {
            return new DialInputProvider(fileApi, "input_schemas.json");
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DialFileApi dialFileApi;

    @Autowired
    private ResourceLoader resourceLoader;

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
                                .setType(Api.ColumnDataType.DOUBLE)
                                .setHash("667668fa41db37f4e12d14309f1712a49f3e1bf7e24fbb9433f842fbdb5453ca")
                                .setFormat(Api.ColumnFormat.newBuilder()
                                        .setGeneralArgs(Api.GeneralFormatArgs.getDefaultInstance())
                                        .build()))
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
                                .setType(Api.ColumnDataType.TABLE_REFERENCE)
                                .setIsNested(true)
                                .setReferenceTableName("A")
                                .addReferences(tableReference("A"))))
                .build();

        Api.Response actual = sendRequest("/v1/schema", request);

        assertThat(actual).isEqualTo(expected);
    }

    @ParameterizedTest
    @MethodSource("inputErrors")
    void testSchemaParsingErrors(String name, String expectedError) throws Exception {
        String bucket = "test-bucket";
        String etag = "test-etag";
        String prefix = "files/" + bucket + "/";
        String input = prefix + name + ".csv";
        String schema = prefix + "." + name + ".schema";
        InputStream inputStream = resourceLoader.getResource("classpath:test-inputs/malformed/" + name + ".csv")
                .getInputStream();
        when(dialFileApi.getAttributes(eq(input), eq(true), eq(false), isNull(), any()))
                .thenReturn(new DialFileApi.Attributes(etag, input, null, null, List.of("READ"), null, List.of()));
        when(dialFileApi.readFile(eq(schema), any()))
                .thenThrow(new FileNotFoundException());
        when(dialFileApi.getBucket(any()))
                .thenReturn(bucket);
        when(dialFileApi.readFile(eq(input), any()))
                .thenReturn(new EtaggedStream(inputStream, inputStream, etag));

        String formula = "INPUT(\"%s\")".formatted(input);
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setDimensionalSchemaRequest(Api.DimensionalSchemaRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", ""))
                        .setFormula(formula))
                .build();
        Api.Response expected = Api.Response.newBuilder()
                .setId(TEST_ID)
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setFormula(formula)
                        .setErrorMessage(expectedError))
                .build();

        Api.Response actual = sendRequest("/v1/schema", request);

        assertThat(actual).isEqualTo(expected);
    }

    private static Stream<Arguments> inputErrors() {
        return Stream.of(
                Arguments.of("duplicated-column", "Column names must be unique. Duplicate found: a."),
                Arguments.of("empty", "The document doesn't have headers."));
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
                        .content(ApiMessageMapper.fromApiRequest(request))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return ApiMessageMapper.toApiResponse(response);
    }

    @Test
    void testReferences() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCompileWorksheetsRequest(Api.CompileWorksheetsRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  [f1a] = 1
                                  [f2a] = 2
                                
                                table B
                                  [f1b] = A
                                  [f2b] = [f1b][f1a]
                                  [f3b] = A[f1a]
                                  [f4b] = A.FILTER(A[f1a] = 1)
                                  [f5b] = A(1)[f1a]
                                  [f6b] = 1
                                total
                                  [f6b] = A.COUNT()
                                
                                table C
                                  dim [f1c] = RANGE(3)
                                  [f2c] = 1
                                override
                                row,[f2c]
                                1,A.COUNT()
                                2,C(1)[f2c]
                                3,B.TOTAL(1)[f6b]
                                
                                table D
                                  [f1d], [f2d] = A[[f1a], [f2a]]
                                """)))
                .build();
        Map<ParsedKey, List<Api.Reference>> expected = new LinkedHashMap<>();
        expected.put(new FieldKey("A", "f1a"), List.of());
        expected.put(new FieldKey("A", "f2a"), List.of());
        expected.put(new FieldKey("B", "f1b"), List.of(
                        tableReference("A")));
        expected.put(new FieldKey("B", "f2b"), List.of(
                        fieldReference("A", "f1a"),
                        fieldReference("B", "f1b")));
        expected.put(new FieldKey("B", "f3b"), List.of(
                        fieldReference("A", "f1a"),
                        tableReference("A")));
        expected.put(new FieldKey("B", "f4b"), List.of(
                        tableReference("A"),
                        fieldReference("A", "f1a")));
        expected.put(new FieldKey("B", "f5b"), List.of(
                        fieldReference("A", "f1a"),
                        tableReference("A")));
        expected.put(new FieldKey("B", "f6b"), List.of());
        expected.put(new FieldKey("C", "f1c"), List.of());
        expected.put(new FieldKey("C", "f2c"), List.of());
        expected.put(new OverrideKey("C", "f2c", 1), List.of(
                        tableReference("A")));
        expected.put(new OverrideKey("C", "f2c", 2), List.of(
                        fieldReference("C", "f2c"),
                        tableReference("C")));
        expected.put(new OverrideKey("C", "f2c", 3), List.of(
                        totalReference("B", "f6b", 1)));
        expected.put(new FieldKey("D", "f1d"), List.of(
                        fieldReference("A", "f1a"),
                        fieldReference("A", "f2a"),
                        tableReference("A")));
        expected.put(new FieldKey("D", "f2d"), List.of(
                        fieldReference("A", "f1a"),
                        fieldReference("A", "f2a"),
                        tableReference("A")));
        expected.put(new TotalKey("B", "f6b", 1), List.of(
                tableReference("A")));

        Api.Response response = sendRequest("/v1/compile", request);

        Map<ParsedKey, List<Api.Reference>> references = response.getCompileResult().getFieldInfoList().stream()
                .sorted(Comparator.comparing(fieldInfo -> toParsedKey(fieldInfo).toString()))
                .collect(Collectors.toMap(
                        CompileControllerTest::toParsedKey,
                        Api.FieldInfo::getReferencesList,
                        (a, b) -> {
                            throw new IllegalStateException("Duplicate key");
                        },
                        LinkedHashMap::new));

        assertThat(response.getCompileResult().getCompilationErrorsList()).isEmpty();
        assertThat(references).isEqualTo(expected);
    }

    private static Api.Reference tableReference(String table) {
        return Api.Reference.newBuilder()
                .setTableKey(Api.TableKey.newBuilder()
                        .setTable(table)
                        .build())
                .build();
    }

    private static Api.Reference fieldReference(String table, String field) {
        return Api.Reference.newBuilder()
                .setFieldKey(Api.FieldKey.newBuilder()
                        .setTable(table)
                        .setField(field)
                        .build())
                .build();
    }

    private static Api.Reference totalReference(String table, String field, int number) {
        return Api.Reference.newBuilder()
                .setTotalKey(Api.TotalKey.newBuilder()
                        .setTable(table)
                        .setField(field)
                        .setNumber(number)
                        .build())
                .build();
    }

    private static ParsedKey toParsedKey(Api.FieldInfo fieldInfo) {
        if (fieldInfo.hasFieldKey()) {
            Api.FieldKey fieldKey = fieldInfo.getFieldKey();
            return new FieldKey(fieldKey.getTable(), fieldKey.getField());
        }

        if (fieldInfo.hasTotalKey()) {
            Api.TotalKey totalKey = fieldInfo.getTotalKey();
            return new TotalKey(totalKey.getTable(), totalKey.getField(), totalKey.getNumber());
        }

        if (fieldInfo.hasOverrideKey()) {
            Api.OverrideKey overrideKey = fieldInfo.getOverrideKey();
            return new OverrideKey(overrideKey.getTable(), overrideKey.getField(), overrideKey.getRow());
        }

        throw new IllegalArgumentException("Unsupported key type: " + fieldInfo);
    }
}