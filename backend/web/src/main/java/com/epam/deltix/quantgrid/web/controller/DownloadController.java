package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.compute.ComputeException;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.OutputStream;
import java.security.Principal;
import java.util.function.Supplier;

@Slf4j
@RestController
@RequiredArgsConstructor
public class DownloadController {

    private final ComputeService service;

    @PostMapping(value = "/v1/download", consumes = "application/json")
    public Object download(Principal principal, @RequestBody String body, HttpServletResponse response) {
        try {
            log.info("Received download request: {}", body);
            Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getDownloadRequest,
                    Api.DownloadRequest.class);

            String table = request.getDownloadRequest().getTable();
            Supplier<OutputStream> output = () -> {
                try {
                    response.setHeader("Content-Disposition", "attachment;filename=" + table + ".csv");
                    response.setHeader("Content-Type", "text/csv");
                    return response.getOutputStream();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            };

            service.download(request, output, principal);
            return null;
        } catch (Throwable e) {
            log.warn("Failed to handle download request", e);

            HttpStatusCode status = HttpStatus.INTERNAL_SERVER_ERROR;
            String message = "Internal server error";

            if (e instanceof IllegalArgumentException) {
                status = HttpStatus.BAD_REQUEST;
                message = e.getMessage();
            } else if (e instanceof ComputeException) {
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                message = e.getMessage();
            } else if (e instanceof ResponseStatusException error) {
                status = error.getStatusCode();
                message = error.getReason();
            }

            return new ResponseEntity<>(message, status);
        }
    }
}