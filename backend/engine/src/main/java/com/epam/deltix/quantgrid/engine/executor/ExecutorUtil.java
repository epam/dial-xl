package com.epam.deltix.quantgrid.engine.executor;

import lombok.experimental.UtilityClass;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

@UtilityClass
public class ExecutorUtil {

    public static ExecutorService singleThreadExecutor() {
        return Executors.newSingleThreadExecutor();
    }

    public static ExecutorService fixedThreadExecutor(int threads) {
        return Executors.newFixedThreadPool(threads, engineThreadFactory());
    }

    public static ExecutorService fixedThreadExecutor() {
        return fixedThreadExecutor(Runtime.getRuntime().availableProcessors());
    }

    public static ExecutorService indexThreadExecutor() {
        return Executors.newSingleThreadExecutor(indexThreadFactory());
    }

    private static ThreadFactory engineThreadFactory() {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            int id = counter.incrementAndGet();
            Thread thread = new Thread(runnable, "engine-" + id);
            thread.setDaemon(true);
            return thread;
        };
    }

    private static ThreadFactory indexThreadFactory() {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            int id = counter.incrementAndGet();
            Thread thread = new Thread(runnable, "index-" + id);
            thread.setDaemon(true);
            thread.setPriority(Thread.MIN_PRIORITY);
            return thread;
        };
    }
}
