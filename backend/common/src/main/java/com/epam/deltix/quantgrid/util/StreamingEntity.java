package com.epam.deltix.quantgrid.util;

import org.apache.http.entity.AbstractHttpEntity;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Objects;

class StreamingEntity extends AbstractHttpEntity {
    private final BodyWriter writer;

    StreamingEntity(BodyWriter writer, String contentType) {
        Objects.requireNonNull(contentType, "contentType is not provided");
        this.writer = writer;
        setContentType(contentType);
    }

    @Override
    public InputStream getContent() {
        throw new UnsupportedOperationException();
    }

    @Override
    public long getContentLength() {
        return -1;
    }

    @Override
    public boolean isRepeatable() {
        return false;
    }

    @Override
    public boolean isStreaming() {
        return true;
    }

    @Override
    public void writeTo(OutputStream out) throws IOException {
        writer.write(out);
    }
}
