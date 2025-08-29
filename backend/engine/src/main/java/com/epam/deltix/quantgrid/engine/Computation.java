package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.experimental.Accessors;

import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;

@Accessors(fluent = true)
public class Computation {

    private final CompletableFuture<Void> future = new CompletableFuture<>();
    private final Engine engine;
    private final ResultListener handler;
    @Getter
    private final long id;
    @Getter
    private final boolean profile;
    private int ready;
    private int total;

    Computation(Engine engine, ResultListener handler, long id, boolean profile) {
        this.engine = engine;
        this.handler = handler;
        this.id = id;
        this.profile = profile;
    }

    public void cancel() {
        if (!future.isDone()) {
            engine.cancel(this, null);
        }
    }

    public void cancel(Set<ParsedKey> keys) {
        if (!future.isDone()) {
            engine.cancel(this, keys);
        }
    }

    @SneakyThrows
    public void await(long timeout, TimeUnit unit) {
        try {
            future.get(timeout, unit);
        } catch (TimeoutException e) {
            cancel();
            throw e;
        }
    }

    public void onComplete(Consumer<Throwable> action) {
        future.whenComplete((unused, error) -> action.accept(error));
    }

    void onUpdate(int results, boolean cancel) {
        ready = 0;
        total = results;

        if (total == 0) {
            if (cancel) {
                future.cancel(false);
            } else {
                future.complete(null);
            }
        }
    }

    void onProfile(Trace trace, long startedAt, long stoppedAt, boolean completed) {
        handler.onProfile(trace, startedAt, stoppedAt, completed);
    }

    void onSearchResult(FieldKey key, Table table, String error) {
        Util.verify(ready < total);
        try {
            handler.onSimilaritySearch(key, table, error);
        } finally {
            if (++ready == total) {
                future.complete(null);
            }
        }
    }

    void onViewportResult(ParsedKey key, ResultType type,
                          long start, long end,
                          boolean content, boolean raw,
                          Table table, String error) {
        Util.verify(ready < total);
        try {
            handler.onUpdate(key, start, end, content, raw, table, error, type);
        } finally {
            if (++ready == total) {
                future.complete(null);
            }
        }
    }

    void onIndexResult(FieldKey key, Table value, String error) {
        Util.verify(ready < total);
        try {
            handler.onIndex(key, value, error);
        } finally {
            if (++ready == total) {
                future.complete(null);
            }
        }
    }
}