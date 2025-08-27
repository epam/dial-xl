package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import io.micrometer.common.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SimilaritySearchController {

    private final ComputeService service;

    @PostMapping(path = "/v1/similarity_search", consumes = "application/json", produces = "application/json")
    public String search(@RequestBody String body, Principal principal) {
        log.info("Received similarity search request: {}", body);
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getSimilaritySearchRequest,
                Api.SimilaritySearchRequest.class);
        verify(request.getSimilaritySearchRequest());

        Api.Response response = service.search(request, principal);
        return ApiMessageMapper.fromApiResponse(response);
    }

    private static void verify(Api.SimilaritySearchRequest request) {
        if (StringUtils.isBlank(request.getProject())) {
            throw new IllegalArgumentException("project is missing or empty");
        }

        if (request.getColumnsCount() > 0 && request.getUseEvaluation()) {
            throw new IllegalArgumentException("columns and use_evaluation can't be specified at the same time");
        }

        if (request.getSearchInAll() && request.getUseEvaluation()) {
            throw new IllegalArgumentException("search_in_all and use_evaluation can't be specified at the same time");
        }

        if (request.getColumnsCount() > 0 && request.getSearchInAll()) {
            throw new IllegalArgumentException("columns and search_in_all can't be specified at the same time");
        }

        if (request.getColumnsCount() > 0) {
            Set<FieldKey> uniqueColumns = new HashSet<>();
            for (int i = 0; i < request.getColumnsCount(); ++i) {
                Api.SimilaritySearchColumn column = request.getColumns(i);
                FieldKey key = new FieldKey(column.getTable(), column.getColumn());
                if (!uniqueColumns.add(key)) {
                    throw new IllegalArgumentException("columns has duplicates");
                }
            }
        }
    }
}