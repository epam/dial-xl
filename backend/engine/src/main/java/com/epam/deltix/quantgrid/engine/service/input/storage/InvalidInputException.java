package com.epam.deltix.quantgrid.engine.service.input.storage;

import lombok.Getter;

public final class InvalidInputException extends RuntimeException {

    @Getter
    private final String etag;

    public InvalidInputException(String etag, String message) {
        super(message);
        this.etag = etag;
    }

    public InvalidInputException(String etag, Throwable cause) {
        super(cause.getMessage() == null ? "Invalid input" : cause.getMessage(), cause);
        this.etag = etag;
    }
}