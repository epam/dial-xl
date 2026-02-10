package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;

@Slf4j
@RestController
@RequiredArgsConstructor
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "COMPUTE", matchIfMissing = true)
public class ImportComputeController {

    private final ComputeService computer;
    private final HeartbeatService heartbeater;

    @PostMapping(value = "/v1/import", consumes = "application/json", produces = "text/event-stream")
    public SseEmitter calculate(@RequestBody String body, Principal principal) {
        SseEmitter emitter = new SseEmitter(computer.timeout());
        try {
            log.info("Received import request: {}", body);
            Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportRequest,
                    Api.ImportRequest.class);
            heartbeater.addEmitter(emitter);

            SseCallback callback = new SseCallback(heartbeater, emitter);
            ComputeService.ComputeTask task = computer.importData(request, callback, principal);
            emitter.onTimeout(task::cancel);
            emitter.onError(e -> task.cancel());

            return emitter;
        } catch (Throwable e) {
            heartbeater.removeEmitter(emitter);
            throw e;
        }
    }
}