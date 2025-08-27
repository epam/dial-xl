package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;
import java.util.concurrent.CancellationException;

@Slf4j
@RestController
@RequiredArgsConstructor
public class CalculateController {

    private final ComputeService service;
    private final HeartbeatService heartbeatService;

    @PostMapping(value = "/v1/calculate", consumes = "application/json", produces = "text/event-stream")
    public SseEmitter calculate(@RequestBody String body, Principal principal) {
        SseEmitter emitter = new SseEmitter(service.timeout());
        try {
            log.info("Received calculation request: {}", body);
            Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getCalculateWorksheetsRequest,
                    Api.CalculateWorksheetsRequest.class);
            heartbeatService.addEmitter(emitter);

            ComputeService.ComputeTask task = service.compute(request, new Sender(emitter), principal);
            emitter.onTimeout(task::cancel);
            emitter.onError(e -> task.cancel());

            return emitter;
        } catch (Throwable e) {
            heartbeatService.removeEmitter(emitter);
            throw e;
        }
    }

    @RequiredArgsConstructor
    class Sender implements ComputeService.ComputeCallback {
        private final SseEmitter emitter;
        private boolean errored;

        @Override
        public void onUpdate(Api.Response response) {
            if (errored) {
                return;
            }

            try {
                emitter.send(ApiMessageMapper.fromApiResponse(response));
            } catch (Throwable e) {
                errored = true;
                log.error("Failed to send calculation result", e);
            }
        }

        @Override
        public void onComplete() {
            heartbeatService.removeEmitter(emitter);

            if (errored) {
                return;
            }

            try {
                emitter.send("[DONE]");
                emitter.complete();
                log.info("Sent calculation response");
            } catch (Throwable e) {
                errored = true;
                log.error("Failed to complete response", e);
            }
        }

        @Override
        public void onFailure(Throwable error) {
            log.warn("Error while calculating request", error);
            heartbeatService.removeEmitter(emitter);

            if (errored) {
                return;
            }

            try {
                String message = (error instanceof CancellationException) ? "[CANCEL]" : "[ERROR]";
                emitter.send(message);
                emitter.complete();
            } catch (Throwable e) {
                errored = true;
                log.error("Failed to complete response with error", e);
            }
        }
    }
}