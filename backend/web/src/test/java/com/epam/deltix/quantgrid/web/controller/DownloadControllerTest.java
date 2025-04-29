package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
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

import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@Slf4j
@SpringBootTest
@AutoConfigureMockMvc
class DownloadControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void testSuccessfulDownload() throws Exception {
        Api.Request request = request("""
                table A
                  dim [a] = RANGE(5)
                      [b] = [a] & " $"
                      [c] = ""
                  override
                  row, [c]
                  1, ""
                  2, "'""
                  3, NA
                  4, ","
                  5, "ab'"cd'"ef"
                """, "A", "a", "b", "c");

        String expectedBody = """
                a,b,c
                1,1 $,
                2,2 $,""\""
                3,3 $,N/A
                4,4 $,","
                5,5 $,"ab""cd""ef"
                """;

        MockHttpServletResponse response = download(request);
        Assertions.assertEquals(200, response.getStatus());
        Assertions.assertEquals("attachment;filename=A.csv", response.getHeader("Content-Disposition"));
        Assertions.assertEquals("text/csv", response.getHeader("Content-Type"));
        Assertions.assertEquals(expectedBody, response.getContentAsString());
    }

    @Test
    void testFailedDownload() throws Exception {
        Api.Request request = request("""
                table A
                  dim [a] = RANGE(5)
                """, "A", "a", "b");

        String expectedBody = "A[b] is missing or errored";
        MockHttpServletResponse response = download(request);
        Assertions.assertEquals(400, response.getStatus());
        Assertions.assertNull(response.getHeader("Content-Disposition"));
        Assertions.assertEquals("text/plain;charset=UTF-8", response.getHeader("Content-Type"));
        Assertions.assertEquals(expectedBody, response.getContentAsString());
    }

    private static Api.Request request(String dsl, String table, String... columns) {
        return Api.Request.newBuilder()
                .setDownloadRequest(Api.DownloadRequest.newBuilder()
                        .putAllSheets(Map.of("Test", dsl))
                        .setTable(table)
                        .addAllColumns(List.of(columns)))
                .build();
    }

    private MockHttpServletResponse download(Api.Request request) throws Exception {
        return mockMvc.perform(post("/v1/download")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ApiMessageMapper.fromApiRequest(request))
                        .with(jwt()))
                .andReturn()
                .getResponse();
    }
}