package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ExportController {

    private final ComputeService service;

    @PostMapping(value = "/v1/export", consumes = "application/json")
    public void export(Principal principal, @RequestBody String body) {
        log.info("Received download request: {}", body);
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getExportRequest,
                Api.ExportRequest.class);

        service.export(request, principal);
    }
}