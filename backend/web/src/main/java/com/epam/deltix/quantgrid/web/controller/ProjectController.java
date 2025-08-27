package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.project.ProjectService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Slf4j
@RestController
@RequiredArgsConstructor
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class ProjectController {

    private final ProjectService service;

    @PostMapping(value = "/v1/project/calculate", consumes = "application/json")
    public void calculate(Principal principal, @RequestBody String body) throws Exception {
        log.info("Received project calculation request: {}", body);
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getProjectCalculateRequest,
                Api.ProjectCalculateRequest.class);

        service.calculate(principal, request);
    }

    @PostMapping(value = "/v1/project/cancel", consumes = "application/json")
    public void cancel(Principal principal, @RequestBody String body) throws Exception {
        log.info("Received project cancel request: {}", body);
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getProjectCancelRequest,
                Api.ProjectCancelRequest.class);

        service.cancel(principal, request);
    }
}