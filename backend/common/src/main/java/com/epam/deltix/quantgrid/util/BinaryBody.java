package com.epam.deltix.quantgrid.util;

import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MIME;
import org.apache.http.entity.mime.content.AbstractContentBody;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

class BinaryBody extends AbstractContentBody {

    private final String filename;
    private final BodyWriter writer;

    public BinaryBody(String filename, String contentType, BodyWriter writer) {
        super(ContentType.create(contentType, StandardCharsets.UTF_8));
        this.filename = filename;
        this.writer = writer;
    }

    @Override
    public String getFilename() {
        return filename;
    }

    @Override
    public String getTransferEncoding() {
        return MIME.ENC_BINARY;
    }

    @Override
    public long getContentLength() {
        return -1;
    }

    @Override
    public void writeTo(OutputStream out) throws IOException {
        writer.write(out);
    }
}