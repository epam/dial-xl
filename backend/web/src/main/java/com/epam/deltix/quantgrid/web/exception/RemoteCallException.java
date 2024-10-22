package com.epam.deltix.quantgrid.web.exception;

import java.nio.charset.StandardCharsets;

public class RemoteCallException extends RuntimeException  {

    private final int status;

    public RemoteCallException(int status, byte[] body) {
        super(new String(body, StandardCharsets.UTF_8));
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
