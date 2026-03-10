package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final ComputeService computer;

    @GetMapping("health")
    public ResponseEntity<Void> healthCheck() {
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @GetMapping(value = "health/liveness", produces = "application/json")
    public ResponseEntity<String> livenessCheck() {
        String body = "{\"status\":\"UP\"}";
        return new ResponseEntity<>(body, HttpStatus.OK);
    }

    @GetMapping(value = "health/readiness", produces = "application/json")
    public ResponseEntity<String> readinessCheck() {
        boolean ready = computer.isReady();
        HttpStatus status = ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        String body = "{\"status\":\"%s\"}".formatted(ready ? "UP": "DOWN");
        return new ResponseEntity<>(body, status);
    }
}
