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

            SseCallback callback = new SseCallback(heartbeatService, emitter);
            ComputeService.ComputeTask task = service.compute(request, callback, principal);
            emitter.onTimeout(task::cancel);
            emitter.onError(e -> task.cancel());

            return emitter;
        } catch (Throwable e) {
            heartbeatService.removeEmitter(emitter);
            throw e;
        }
    }

    @PostMapping(value = "/v1/calculate_control_values", produces = "application/json")
    public String calculateControlValues(Principal principal, @RequestBody String body) {
        log.info("Received calculate control values request: {}", body);
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getControlValuesRequest,
                Api.ControlValuesRequest.class);

        Api.Response response = service.computeControlValues(request, principal);
        return ApiMessageMapper.fromApiResponse(response);
    }
}