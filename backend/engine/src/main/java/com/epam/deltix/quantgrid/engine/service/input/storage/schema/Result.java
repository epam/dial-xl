package com.epam.deltix.quantgrid.engine.service.input.storage.schema;

import com.epam.deltix.quantgrid.util.ParserException;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import javax.annotation.Nullable;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Result<T>(@Nullable T value, @Nullable String error, long timestamp) {
    @JsonIgnore
    public T getValueOrThrow() {
        if (error != null) {
            throw new ParserException(error);
        }
        return value;
    }

    @JsonIgnore
    public Result<T> withTimestamp(long newTimestamp) {
        return new Result<>(value, error, newTimestamp);
    }

    public static <Y> Result<Y> value(Y value, long timestamp) {
        return new Result<>(value, null, timestamp);
    }

    public static <Y> Result<Y> error(String error, long timestamp) {
        return new Result<>(null, error, timestamp);
    }
}
