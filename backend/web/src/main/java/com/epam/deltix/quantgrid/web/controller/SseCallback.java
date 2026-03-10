package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.CancellationException;

@Slf4j
@RequiredArgsConstructor
class SseCallback implements ComputeService.ComputeCallback {
    private final HeartbeatService heartbeatService;
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
            log.error("Failed to send SSE message", e);
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
            log.info("Sent SSE response");
        } catch (Throwable e) {
            errored = true;
            log.error("Failed to complete SSE response", e);
        }
    }

    @Override
    public void onFailure(Throwable error) {
        log.warn("Error while sending SSE response", error);
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
            log.error("Failed to complete SSE response with error", e);
        }
    }
}