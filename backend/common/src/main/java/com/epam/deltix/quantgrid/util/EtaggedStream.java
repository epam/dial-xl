package com.epam.deltix.quantgrid.util;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;

public record EtaggedStream(Closeable closure, InputStream stream, String etag) implements Closeable {
    @Override
    public void close() throws IOException {
        try (Closeable closure = this.closure) {
            // close resources
        }
    }
}
