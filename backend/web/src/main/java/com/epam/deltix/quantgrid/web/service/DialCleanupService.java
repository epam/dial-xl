package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.store.dial.DialStore;
import com.epam.deltix.quantgrid.web.config.ConditionalOnDialStorageEnabled;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Duration;
import javax.annotation.PostConstruct;

@Slf4j
@Service
@ConditionalOnDialStorageEnabled
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL", matchIfMissing = true)
public class DialCleanupService {
    private final TaskScheduler taskScheduler;
    private final DialStore store;
    private final Duration cleanupInterval;

    public DialCleanupService(
            TaskScheduler taskScheduler,
            DialStore store,
            @Value("${web.storage.dial.results.cleanup.interval:1d}")
            Duration cleanupInterval) {
        this.taskScheduler = taskScheduler;
        this.store = store;
        this.cleanupInterval = cleanupInterval;
    }

    @PostConstruct
    public void init() {
        taskScheduler.scheduleWithFixedDelay(store::cleanup, cleanupInterval);
    }
}
