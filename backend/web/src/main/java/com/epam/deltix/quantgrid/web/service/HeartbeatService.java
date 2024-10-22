package com.epam.deltix.quantgrid.web.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import javax.annotation.PostConstruct;

@Slf4j
@Service
public class HeartbeatService {
    private final Map<SseEmitter, Long> emitters = new ConcurrentHashMap<>();
    private final TaskScheduler scheduler;
    private final long heartbeatPeriodMillis;

    public HeartbeatService(
            TaskScheduler scheduler,
            @Value("${web.heartbeatPeriodMillis}")
            long heartbeatPeriodMillis) {
        this.scheduler = scheduler;
        this.heartbeatPeriodMillis = heartbeatPeriodMillis;
    }

    @PostConstruct
    public void start() {
        log.info("Starting Heartbeat service");
        long testPeriod = heartbeatPeriodMillis / 2;
        scheduler.scheduleAtFixedRate(
                this::sendHeartbeats,
                Instant.now().plusMillis(testPeriod),
                Duration.ofMillis(testPeriod));
    }

    public void addEmitter(SseEmitter emitter) {
        log.trace("Add emitter {} to the subscription list", emitter.hashCode());
        emitters.put(emitter, System.currentTimeMillis());
    }

    public void removeEmitter(SseEmitter emitter) {
        if (emitters.remove(emitter) != null) {
            log.trace("Removed emitter {} from the subscription list", emitter.hashCode());
        }
    }

    private void sendHeartbeats() {
        Long now = System.currentTimeMillis();
        List<SseEmitter> keys = List.copyOf(emitters.keySet());
        log.trace("Sending heartbeats, connection count: {}", keys.size());
        for (SseEmitter emitter : keys) {
            Long newValue = emitters.computeIfPresent(emitter, (key, previousTime) ->
                    now - previousTime < heartbeatPeriodMillis ? previousTime : now);
            if (Objects.equals(newValue, now)) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (Throwable e) {
                    log.error("Failed to send a heartbeat", e);
                    removeEmitter(emitter);
                }
            }
        }
    }
}
