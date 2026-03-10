package com.epam.deltix.airbyte.destination;


import java.io.IOException;

public class SourceError extends IOException {
    private final String line;

    public SourceError(String message, String line) {
        super(message);
        this.line = line;
    }

    public String getLine() {
        return line;
    }
}
