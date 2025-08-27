package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.utils.TestUtils;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@SpringBootTest
@AutoConfigureMockMvc
class SimilaritySearchControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void testSearchAllWithDescription() throws Exception {
        search(
                """
                        {
                          "similaritySearchRequest": {
                            "project": "my_project",
                            "sheets": {
                              "Sheet": "table A\\n !description(\\"x\\")\\n !index()\\n dim [x] = TEXT(RANGE(5))"
                            },
                            "query": "Find numbers",
                            "n": 3,
                            "searchInAll": true
                          }
                        }
                        """,
                """
                        {
                          "id": "@ignore",
                          "status": "SUCCEED",
                          "similaritySearchResponse": {
                            "scores": [
                              {
                                "table": "A",
                                "column": "x",
                                "value": "3",
                                "description": "3",
                                "score": 0.6984647123464046
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "2",
                                "description": "2",
                                "score": 0.698743648786708
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "5",
                                "description": "5",
                                "score": 0.7310718167495158
                              }
                            ]
                          }
                        }
                        """);
    }

    @Test
    void testSearchAllWithoutDescription() throws Exception {
        search(
                """
                        {
                          "similaritySearchRequest": {
                            "project": "my_project",
                            "sheets": {
                              "Sheet": "table A\\n !index()\\n dim [x] = TEXT(RANGE(5))"
                            },
                            "query": "Find numbers",
                            "n": 3,
                            "searchInAll": true
                          }
                        }
                        """,
                """
                        {
                          "id": "@ignore",
                          "status": "SUCCEED",
                          "similaritySearchResponse": {
                            "scores" : [
                              {
                                "table" : "A",
                                "column" : "x",
                                "value" : "1",
                                "score" : 0.6431054566768258
                              },
                              {
                                "table" : "A",
                                "column" : "x",
                                "value" : "5",
                                "score" : 0.661662653136618
                              },
                              {
                                "table" : "A",
                                "column" : "x",
                                "value" : "3",
                                "score" : 0.65019651815638
                              }
                            ]
                          }
                        }
                        """);
    }

    @Test
    void testSearchSpecific() throws Exception {
        search(
                """
                        {
                          "similaritySearchRequest": {
                            "project": "my_project",
                            "sheets": {
                              "Sheet": "table A\\n !description(\\"x\\")\\n !index()\\n dim [x] = TEXT(RANGE(5))\\n [y] = [x]\\n override\\n row, [x]\\n 3, NA\\n 4, \\"three\\""
                            },
                            "columns": [
                              {
                                "table": "A",
                                "column": "x",
                                "n": 6
                              }
                            ],
                            "query": "Find numbers"
                          }
                        }
                        """,
                """
                        {
                          "id": "@ignore",
                          "status": "SUCCEED",
                          "similaritySearchResponse": {
                            "scores": [
                              {
                                "table": "A",
                                "column": "x",
                                "value": "N/A",
                                "score": 0.5883627121054887
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "three",
                                "description": "three",
                                "score": 0.6896369018500542
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "1",
                                "description": "1",
                                "score": 0.6861869228120772
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "2",
                                "description": "2",
                                "score": 0.698743648786708
                              },
                              {
                                "table": "A",
                                "column": "x",
                                "value": "5",
                                "description": "5",
                                "score": 0.7310718167495158
                              }
                            ]
                          }
                        }
                        """);
    }

    @Test
    void testBadRequest() throws Exception {
        search("bad-request", 400, "Expected Api.Request with SimilaritySearchRequest");
        search("""
                {
                  "similaritySearchRequest": {
                    "project": "my_project",
                    "sheets": {
                      "Sheet": "table A\\n !description(\\"x\\")\\n !index()\\n dim [x] = TEXT(RANGE(5))\\n [y] = [x]\\n override\\n row, [x]\\n 3, NA\\n 4, \\"three\\""
                    },
                    "columns": [
                      {
                        "table": "A",
                        "column": "y",
                        "n": 6
                      }
                    ],
                    "query": "Find numbers"
                  }
                }
                """, 400, "Column A[y] does not have index.");
    }

    private void search(String request, String response) throws Exception {
        String actual = mockMvc.perform(post("/v1/similarity_search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        TestUtils.assertJson(response, actual, 1e-6);
    }

    private void search(String request, int status, String body) throws Exception {
        MockHttpServletResponse response = mockMvc.perform(post("/v1/similarity_search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(jwt()))
                .andReturn()
                .getResponse();

        Assertions.assertEquals(status, response.getStatus());
        Assertions.assertEquals(body, response.getContentAsString());
    }
}