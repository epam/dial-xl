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
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "COMPUTE", matchIfMissing = true)
public class DialLockService {
    private final TaskScheduler taskScheduler;
    private final DialStore store;
    private final Duration syncInterval;

    public DialLockService(
            TaskScheduler taskScheduler,
            DialStore store,
            @Value("${web.storage.dial.results.lock.accessSyncInterval:60s}")
            Duration syncInterval) {
        this.taskScheduler = taskScheduler;
        this.store = store;
        this.syncInterval = syncInterval;
    }

    @PostConstruct
    public void init() {
        taskScheduler.scheduleWithFixedDelay(store::refreshLocks, syncInterval);
    }
}
