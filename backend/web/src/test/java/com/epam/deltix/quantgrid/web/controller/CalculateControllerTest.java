package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.deltix.quantgrid.web.utils.TestUtils;
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
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"STRING","isNested":false,"isAssignable":true,"hash":"30a675e677f073101dc1ce3e4ee078af784cb29cbcbf06e0ee5501bf873f4e33","format":{"type":"FORMAT_TYPE_GENERAL","generalArgs":{}},"references":[]}],"indices":[{"table":"A","field":"a"}]}}
                
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
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"STRING","isNested":false,"isAssignable":true,"hash":"30a675e677f073101dc1ce3e4ee078af784cb29cbcbf06e0ee5501bf873f4e33","format":{"type":"FORMAT_TYPE_GENERAL","generalArgs":{}},"references":[]}],"indices":[{"table":"A","field":"a"}]}}
                
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
                data:{"id":"test-id","compileResult":{"sheets":[{"name":"Test","parsingErrors":[]}],"compilationErrors":[{"fieldKey":{"table":"A","field":"a"},"message":"Unsupported compiled result CompiledSimpleColumn"}],"fieldInfo":[{"fieldKey":{"table":"A","field":"a"},"type":"DOUBLE","isNested":false,"isAssignable":true,"hash":"ed49df5434e203f4bd06f432de76d675a4a94a5f3bc115b7a04344685cb0c1a4","format":{"type":"FORMAT_TYPE_GENERAL","generalArgs":{}},"references":[]}],"indices":[]}}
                
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

    @Test
    void testCalculatePivotOldWorkflow() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(false)
                        .setIncludeIndices(false)
                        .setIncludeProfile(false)
                        .putWorksheets("Test", """
                                table A
                                  dim [val] = RANGE(10)
                                      !format("number", 2, ",")
                                      [val2] = [val]
                                      [company] = "company" & ([val] MOD 3)
                                      [indicator] = "indicator" & ([val] MOD 2)
                                      [index] = [val] MOD 3
                                
                                table B
                                  dim [company], [*] = PIVOT(A[company], A[indicator], A[val2], "SUM")
                                """)
                        .addViewports(Api.Viewport.newBuilder()
                                .setFieldKey(Api.FieldKey.newBuilder().setTable("B").setField("*").build())
                                .setStartRow(0)
                                .setEndRow(1000)
                                .setIsRaw(true)
                                .build()))
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
        Assertions.assertEquals("""
                data:{"id":"test-id","status":"SUCCEED","columnData":{"fieldKey":{"table":"B","field":"*"},"data":["indicator0","indicator1"],"startRow":"0","endRow":"1000","totalRows":"2","type":"STRING","isNested":false,"periodSeries":[],"format":{"type":"FORMAT_TYPE_GENERAL","generalArgs":{}},"isRaw":true}}
                
                data:[DONE]
                
                """, events);
    }

    @Test
    void testCalculatePivotNewWorkflow() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .setIncludeCompilation(false)
                        .setIncludeIndices(false)
                        .setIncludeProfile(false)
                        .putWorksheets("Test", """
                                table A
                                  dim [val] = RANGE(10)
                                      !format("number", 2, ",")
                                      [val2] = [val]
                                      [company] = "company" & ([val] MOD 3)
                                      [indicator] = "indicator" & ([val] MOD 2)
                                      [index] = [val] MOD 3
                                
                                table B
                                  dim [company], [*] = PIVOT(A[company], A[indicator], A[val2], "SUM")
                                """)
                        .addViewports(Api.Viewport.newBuilder()
                                .setFieldKey(Api.FieldKey.newBuilder().setTable("B").setField("*").build())
                                .setStartRow(0)
                                .setEndRow(1000)
                                .setStartColumn(0)
                                .setEndColumn(100)
                                .setIsRaw(true)
                                .build()))
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
        Assertions.assertEquals("""
                data:{"id":"test-id","status":"SUCCEED","columnData":{"fieldKey":{"table":"B","field":"*"},"data":["indicator0","indicator1"],"startRow":"0","endRow":"100","totalRows":"2","type":"STRING","isNested":false,"periodSeries":[],"format":{"type":"FORMAT_TYPE_GENERAL","generalArgs":{}},"isRaw":true}}
                
                data:{"id":"test-id","status":"SUCCEED","columnData":{"fieldKey":{"table":"B","field":"indicator0"},"data":["6","14","10"],"startRow":"0","endRow":"1000","totalRows":"3","type":"DOUBLE","isNested":false,"periodSeries":[],"format":{"type":"FORMAT_TYPE_NUMBER","numberArgs":{"format":"2.0","useThousandsSeparator":true}},"isRaw":true}}
                
                data:{"id":"test-id","status":"SUCCEED","columnData":{"fieldKey":{"table":"B","field":"indicator1"},"data":["12","8","5"],"startRow":"0","endRow":"1000","totalRows":"3","type":"DOUBLE","isNested":false,"periodSeries":[],"format":{"type":"FORMAT_TYPE_NUMBER","numberArgs":{"format":"2.0","useThousandsSeparator":true}},"isRaw":true}}
                
                data:[DONE]
                
                """, events);
    }

    @Test
    void testEmptyControlValues() throws Exception {
        String dsl = """
                !manual()
                table Data
                  [company]
                  [indicator]
                  [value]
                override
                  [company],[indicator],[value]
                  "APPLE",10,100
                  "MICROSOFT",10,200
                  "APPLE",20,300
                
                !control()
                table Control
                  [company] = DROPDOWN(Data, Data[company], )
                  [indicator] = DROPDOWN(Data, Data[indicator], 20)
                """;

        verifyControlValues(dsl, "Control", "company", "", """
                {
                  "id" : "test-id",
                  "status" : "SUCCEED",
                  "controlValuesResponse" : {
                    "data" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "company"
                      },
                      "data" : [ "APPLE", "MICROSOFT" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "STRING",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_GENERAL",
                        "generalArgs" : { }
                      },
                      "isRaw" : true
                    },
                    "available" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "company"
                      },
                      "data" : [ "1", "0" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_BOOLEAN",
                        "booleanArgs" : { }
                      },
                      "isRaw" : true
                    }
                  }
                }
                """);

        verifyControlValues(dsl, "Control", "indicator", "", """
                {
                  "id" : "test-id",
                  "status" : "SUCCEED",
                  "controlValuesResponse" : {
                    "data" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "indicator"
                      },
                      "data" : [ "10", "20" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_GENERAL",
                        "generalArgs" : { }
                      },
                      "isRaw" : true
                    },
                    "available" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "indicator"
                      },
                      "data" : [ "1", "1" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_BOOLEAN",
                        "booleanArgs" : { }
                      },
                      "isRaw" : true
                    }
                  }
                }
                """);
    }

    @Test
    void testControlValues() throws Exception {
        String dsl = """
                !manual()
                table Data
                  [company]
                  [indicator]
                  [value]
                override
                  [company],[indicator],[value]
                  "APPLE",10,100
                  "MICROSOFT",10,200
                  "APPLE",20,300
                
                !control()
                table Control
                  [company] = DROPDOWN(Data, Data[company], "MICROSOFT")
                  [indicator] = CHECKBOX(Data, Data[indicator], {10})
                  [all_company] = DROPDOWN(, Data[company], "MICROSOFT")
                  [all_indicator] = CHECKBOX(, Data[indicator], {})
                """;

        verifyControlValues(dsl, "Control", "company", "", """
                 {
                   "id" : "test-id",
                   "status" : "SUCCEED",
                   "controlValuesResponse" : {
                     "data" : {
                       "fieldKey" : {
                         "table" : "Control",
                         "field" : "company"
                       },
                       "data" : [ "APPLE", "MICROSOFT" ],
                       "startRow" : "0",
                       "endRow" : "100",
                       "totalRows" : "2",
                       "type" : "STRING",
                       "isNested" : true,
                       "periodSeries" : [ ],
                       "format" : {
                         "type" : "FORMAT_TYPE_GENERAL",
                         "generalArgs" : { }
                       },
                       "isRaw" : true
                     },
                     "available" : {
                       "fieldKey" : {
                         "table" : "Control",
                         "field" : "company"
                       },
                       "data" : [ "1", "1" ],
                       "startRow" : "0",
                       "endRow" : "100",
                       "totalRows" : "2",
                       "type" : "DOUBLE",
                       "isNested" : true,
                       "periodSeries" : [ ],
                       "format" : {
                         "type" : "FORMAT_TYPE_BOOLEAN",
                         "booleanArgs" : { }
                       },
                       "isRaw" : true
                     }
                   }
                 }
                """);

        verifyControlValues(dsl, "Control", "indicator", "", """
                {
                  "id" : "test-id",
                  "status" : "SUCCEED",
                  "controlValuesResponse" : {
                    "data" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "indicator"
                      },
                      "data" : [ "10", "20" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_GENERAL",
                        "generalArgs" : { }
                      },
                      "isRaw" : true
                    },
                    "available" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "indicator"
                      },
                      "data" : [ "1", "0" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "2",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_BOOLEAN",
                        "booleanArgs" : { }
                      },
                      "isRaw" : true
                    }
                  }
                }
                """);

        verifyControlValues(dsl, "Control", "all_company", "SOFT", """
                {
                  "id" : "test-id",
                  "status" : "SUCCEED",
                  "controlValuesResponse" : {
                    "data" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "all_company"
                      },
                      "data" : [ "MICROSOFT" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "1",
                      "type" : "STRING",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_GENERAL",
                        "generalArgs" : { }
                      },
                      "isRaw" : true
                    },
                    "available" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "all_company"
                      },
                      "data" : [ "1" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "1",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_BOOLEAN",
                        "booleanArgs" : { }
                      },
                      "isRaw" : true
                    }
                  }
                }
                """);

        verifyControlValues(dsl, "Control", "all_indicator", "2", """
                {
                  "id" : "test-id",
                  "status" : "SUCCEED",
                  "controlValuesResponse" : {
                    "data" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "all_indicator"
                      },
                      "data" : [ "20" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "1",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_GENERAL",
                        "generalArgs" : { }
                      },
                      "isRaw" : true
                    },
                    "available" : {
                      "fieldKey" : {
                        "table" : "Control",
                        "field" : "all_indicator"
                      },
                      "data" : [ "1" ],
                      "startRow" : "0",
                      "endRow" : "100",
                      "totalRows" : "1",
                      "type" : "DOUBLE",
                      "isNested" : true,
                      "periodSeries" : [ ],
                      "format" : {
                        "type" : "FORMAT_TYPE_BOOLEAN",
                        "booleanArgs" : { }
                      },
                      "isRaw" : true
                    }
                  }
                }
                """);
    }

    private void verifyControlValues(String dsl, String table, String field, String query, String response)
            throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setControlValuesRequest(Api.ControlValuesRequest.newBuilder()
                        .setKey(Api.FieldKey.newBuilder().setTable(table).setField(field).build())
                        .setQuery(query)
                        .setStartRow(0)
                        .setEndRow(100)
                        .putSheets("Test", dsl))
                .build();

        String actual = mockMvc.perform(post("/v1/calculate_control_values")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ApiMessageMapper.fromApiRequest(request))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        TestUtils.assertJson(response, actual, 1e-12);
    }

    private static int count(String string, String substring) {
        int count = 0;
        int index = 0;

        while ((index = string.indexOf(substring, index)) != -1) {
            count++;
            index += substring.length();
        }

        return count;
    }

}