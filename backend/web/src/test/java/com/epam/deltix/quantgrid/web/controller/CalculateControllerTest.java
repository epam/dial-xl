package com.epam.deltix.quantgrid.web.controller;

import com.google.protobuf.util.JsonFormat;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@SpringBootTest
@AutoConfigureMockMvc
class CalculateControllerTest {
    private static final String TEST_ID = "test-id";
    private static final JsonFormat.Printer PRINTER = JsonFormat.printer();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testIndexStatus() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(true)
                        .setIncludeIndices(true)
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  !index()
                                  [a] = "asd"
                                """)))
                .build();

        MockHttpServletResponse response = mockMvc.perform(asyncDispatch(mockMvc.perform(post("/v1/calculate")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(PRINTER.print(request))
                                .with(jwt()))
                        .andExpect(request().asyncStarted())
                        .andReturn()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse();

        String events = response.getContentAsString();
        assertThat(events).isEqualTo("""
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"STRING","isNested":false,"hash":"30a675e677f073101dc1ce3e4ee078af784cb29cbcbf06e0ee5501bf873f4e33"}],"indices":[{"table":"A","field":"a"}]}}
                
                data:{"id":"test-id","status":"SUCCEED","index":{"key":{"table":"A","field":"a"}}}
                
                data:[DONE]
                
                """);
    }

    @Test
    void testKeyIndexStatus() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(true)
                        .setIncludeIndices(true)
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  key [a] = "asd"
                                """)))
                .build();

        MockHttpServletResponse response = mockMvc.perform(asyncDispatch(mockMvc.perform(post("/v1/calculate")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(PRINTER.print(request))
                                .with(jwt()))
                        .andExpect(request().asyncStarted())
                        .andReturn()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse();

        String events = response.getContentAsString();
        assertThat(events).isEqualTo("""
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"STRING","isNested":false,"hash":"30a675e677f073101dc1ce3e4ee078af784cb29cbcbf06e0ee5501bf873f4e33"}],"indices":[{"table":"A","field":"a"}]}}
                
                data:{"id":"test-id","status":"SUCCEED","index":{"key":{"table":"A","field":"a"}}}
                
                data:[DONE]
                
                """);
    }

    @Test
    void testIndexCompilationError() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(true)
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  !index()
                                  [a] = 123
                                """)))
                .build();

        MockHttpServletResponse response = mockMvc.perform(asyncDispatch(mockMvc.perform(post("/v1/calculate")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(PRINTER.print(request))
                                .with(jwt()))
                        .andExpect(request().asyncStarted())
                        .andReturn()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse();

        String events = response.getContentAsString();
        assertThat(events).isEqualTo("""
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[{"fieldKey":{"table":"A","field":"a"},"message":"Unsupported compiled result CompiledSimpleColumn"}],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"DOUBLE","isNested":false,"hash":"ed49df5434e203f4bd06f432de76d675a4a94a5f3bc115b7a04344685cb0c1a4"}],"indices":[]}}
                
                data:[DONE]
                
                """);
    }

    @Test
    void testIndexCancellation() throws Exception {
        Api.Request calculateBody = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(true)
                        .setIncludeIndices(true)
                        .setIncludeProfile(true)
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  dim key [a] = RANGE(100000) & "fake"
                                """)))
                .build();

        Api.Request cancelBody = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCancelRequest(Api.CancelRequest.newBuilder()
                        .setCalculationId(TEST_ID)
                        .addAllCancellationKeys(List.of(
                                Api.CancelKey.newBuilder()
                                        .setFieldKey(Api.FieldKey.newBuilder()
                                                .setTable("A")
                                                .setField("a")
                                                .build())
                                        .build()))
                        .build())
                .build();

        MvcResult asyncCalculate = mockMvc.perform(post("/v1/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRINTER.print(calculateBody))
                        .with(jwt()))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(post("/v1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRINTER.print(cancelBody))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse();

        MockHttpServletResponse response = mockMvc.perform(asyncDispatch(asyncCalculate))
                .andReturn()
                .getResponse();

        String events = response.getContentAsString();
        int running = count(events, "RUNNING");
        int completed = count(events, "COMPLETED");
        String expectedTrailer = """
                data:[CANCEL]
                
                """;

        String actualTrailer = events.substring(events.length() - expectedTrailer.length());
        Assertions.assertEquals(expectedTrailer, actualTrailer);
        Assertions.assertTrue(running >= completed);
    }

    public static int count(String string, String substring) {
        int count = 0;
        int index = 0;

        while ((index = string.indexOf(substring, index)) != -1) {
            count++;
            index += substring.length();
        }

        return count;
    }

}