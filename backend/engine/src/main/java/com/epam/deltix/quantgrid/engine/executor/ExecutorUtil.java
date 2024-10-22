package com.epam.deltix.quantgrid.engine.executor;

import com.google.common.util.concurrent.MoreExecutors;
import lombok.experimental.UtilityClass;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

@UtilityClass
public class ExecutorUtil {

    public static ExecutorService directExecutor() {
        return MoreExecutors.newDirectExecutorService();
    }

    public static ExecutorService fixedThreadExecutor(int threads) {
        return Executors.newFixedThreadPool(threads, newThreadFactory());
    }

    public static ExecutorService fixedThreadExecutor() {
        return fixedThreadExecutor(Runtime.getRuntime().availableProcessors());
    }

    private static ThreadFactory newThreadFactory() {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            int id = counter.incrementAndGet();
            Thread thread = new Thread(runnable, "engine-" + id);
            thread.setDaemon(true);
            return thread;
        };
    }
}
