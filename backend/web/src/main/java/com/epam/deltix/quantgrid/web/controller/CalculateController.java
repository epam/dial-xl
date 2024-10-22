package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;
import java.util.Objects;

@Slf4j
@RestController
@RequiredArgsConstructor
public class CalculateController {

    private final ComputeService service;
    private final HeartbeatService heartbeatService;

    @PostMapping(value = "/v1/calculate", consumes = "application/json", produces = "text/event-stream")
    public Object calculate(@RequestBody String body, Principal principal) {
        SseEmitter emitter = new SseEmitter();
        try {
            log.info("Received calculation request: {}", body);
            Api.Request request = parseRequest(body);
            heartbeatService.addEmitter(emitter);

            ComputeService.ComputeTask task = service.compute(request, new Sender(emitter), principal);
            emitter.onTimeout(task::cancel);
            emitter.onError(e -> task.cancel());

            return emitter;
        } catch (Throwable e) {
            logException(e);

            heartbeatService.removeEmitter(emitter);
            HttpStatusCode status = HttpStatus.INTERNAL_SERVER_ERROR;
            String message = "Internal server error";

            if (e instanceof IllegalArgumentException) {
                status = HttpStatus.BAD_REQUEST;
                message = e.getMessage();
            } else if (e instanceof HttpClientErrorException error) {
                status = error.getStatusCode();
                message = error.getMessage();
            }

            return new ResponseEntity<>(message, status);
        }
    }

    @ExceptionHandler(Throwable.class)
    private static void logException(Throwable e) {
        log.error("Failed to handle calculation request", e);
    }

    private static Api.Request parseRequest(String body) {
        try {
            Api.Request request = ApiMessageMapper.toApiRequest(body);
            Objects.requireNonNull(request.getCalculateWorksheetsRequest());
            return request;
        } catch (Throwable e) {
            throw new IllegalArgumentException("Expected Api.Request with CalculateWorksheetsRequest");
        }
    }

    @RequiredArgsConstructor
    class Sender implements ComputeService.ComputeCallback {
        private final SseEmitter emitter;

        @Override
        public void onUpdate(Api.Response response) {
            try {
                emitter.send(ApiMessageMapper.fromApiResponse(response)); // emitter::send is thread-safe
            } catch (Throwable e) {
                log.error("Failed to send calculation result", e);
            }
        }

        @Override
        public void onComplete() {
            try {
                heartbeatService.removeEmitter(emitter);
                emitter.send("[DONE]");
                emitter.complete();
                log.info("Sent calculation response");
            } catch (Throwable e) {
                log.error("Failed to complete response", e);
            }
        }

        @Override
        public void onFailure(Throwable error) {
            log.warn("Error while calculating request", error);

            try {
                heartbeatService.removeEmitter(emitter);
                emitter.completeWithError(error);
            } catch (Throwable e) {
                log.error("Failed to complete response with error", e);
            }
        }
    }
}