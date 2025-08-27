package com.epam.deltix.quantgrid.web.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.AccessDeniedException;
import java.util.concurrent.TimeoutException;

@Slf4j
@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<String> handle(Throwable e) {
        log.warn("Failed to handle request", e);

        HttpStatusCode status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = "Internal server error";

        if (e instanceof IllegalArgumentException) {
            status = HttpStatus.BAD_REQUEST;
            message = e.getMessage();
        } else if (e instanceof ResponseStatusException error) {
            status = error.getStatusCode();
            message = error.getReason();
        } else if (e instanceof AccessDeniedException) {
            status = HttpStatus.FORBIDDEN;
            message = e.getMessage();
        } else if (e instanceof TimeoutException) {
            status = HttpStatus.REQUEST_TIMEOUT;
            message = "";
        }

        return new ResponseEntity<>(message, status);
    }
}