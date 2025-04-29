package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.web.service.compute.ComputeException;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import io.micrometer.common.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeoutException;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SimilaritySearchController {

    private final ComputeService service;

    @PostMapping(path = "/v1/similarity_search", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> search(@RequestBody String body, Principal principal) {
        try {
            Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getSimilaritySearchRequest,
                    Api.SimilaritySearchRequest.class);
            verify(request.getSimilaritySearchRequest());

            Api.Response response = service.search(request, principal);
            return ResponseEntity.ok(ApiMessageMapper.fromApiResponse(response));
        } catch (Throwable e) {
            log.warn("Failed to handle similarity search request", e);

            if (e instanceof IllegalArgumentException) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
            }

            if (e instanceof ComputeException) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (e instanceof TimeoutException) {
                return new ResponseEntity<>(HttpStatus.REQUEST_TIMEOUT);
            }

            throw e;
        }
    }

    private static void verify(Api.SimilaritySearchRequest request) {
        if (StringUtils.isBlank(request.getProject())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "project is missing or empty");
        }

        if (request.getColumnsCount() > 0 && request.getUseEvaluation()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "columns and use_evaluation can't be specified at the same time");
        }

        if (request.getSearchInAll() && request.getUseEvaluation()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "search_in_all and use_evaluation can't be specified at the same time"
            );
        }

        if (request.getColumnsCount() > 0 && request.getSearchInAll()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "columns and search_in_all can't be specified at the same time"
            );
        }

        if (request.getColumnsCount() > 0) {
            Set<FieldKey> uniqueColumns = new HashSet<>();
            for (int i = 0; i < request.getColumnsCount(); ++i) {
                Api.SimilaritySearchColumn column = request.getColumns(i);
                FieldKey key = new FieldKey(column.getTable(), column.getColumn());
                if (!uniqueColumns.add(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "columns has duplicates");
                }
            }
        }
    }
}