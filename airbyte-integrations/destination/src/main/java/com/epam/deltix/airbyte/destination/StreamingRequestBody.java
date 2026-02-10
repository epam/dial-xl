package com.epam.deltix.airbyte.destination;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.BufferedSink;
import okio.Okio;
import okio.Pipe;
import okio.Source;

import java.io.IOException;
import java.io.OutputStream;

class StreamingRequestBody extends RequestBody {
    private final MediaType contentType;
    private final Pipe pipe;

    public StreamingRequestBody(MediaType contentType, int bufferSize) {
        this.contentType = contentType;
        this.pipe = new Pipe(bufferSize);
    }

    public OutputStream outputStream() {
        return Okio.buffer(pipe.sink()).outputStream();
    }

    @Override
    public MediaType contentType() {
        return contentType;
    }

    @Override
    public long contentLength() {
        return -1;
    }

    @Override
    public void writeTo(BufferedSink sink) throws IOException {
        try (Source source = pipe.source()) {
            sink.writeAll(source);
        }
    }
}
