package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import jodd.io.FileUtil;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@SpringBootTest
@AutoConfigureMockMvc
class ExportControllerTest {
    @Autowired
    private MockMvc mvc;
    private Path temp;

    @BeforeEach
    void init() throws Exception {
        temp = Files.createTempDirectory("export-qg");
    }

    @AfterEach
    void cleanup() throws Exception  {
        FileUtil.deleteDir(temp.toString());
    }

    @Test
    void testExport() throws Exception {
        Path path = temp.resolve("folder/file.csv").toAbsolutePath();
        Api.Request request = request(path.toString(),
                """
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

        export(request);

        String actualContent = Files.readString(path);
        String expectedContent = """
                a,b,c
                1,1 $,
                2,2 $,""\""
                3,3 $,N/A
                4,4 $,","
                5,5 $,"ab""cd""ef"
                """;

        Assertions.assertEquals(expectedContent, actualContent);
    }

    private static Api.Request request(String path, String dsl, String table, String... columns) {
        return Api.Request.newBuilder()
                .setExportRequest(Api.ExportRequest.newBuilder()
                        .setPath(path)
                        .setProject("my-project")
                        .putAllSheets(Map.of("Test", dsl))
                        .setTable(table)
                        .addAllColumns(List.of(columns)))
                .build();
    }

    private void export(Api.Request request) throws Exception {
        String actual = mvc.perform(post("/v1/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ApiMessageMapper.fromApiRequest(request))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        Assertions.assertEquals("", actual);
    }
}