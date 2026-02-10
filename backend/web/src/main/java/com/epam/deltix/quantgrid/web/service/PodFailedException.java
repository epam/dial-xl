package com.epam.deltix.quantgrid.web.service;

import io.kubernetes.client.openapi.models.V1PodStatus;
import lombok.Getter;

import java.io.IOException;

public class PodFailedException extends IOException {
    @Getter
    private final V1PodStatus status;

    public PodFailedException(String message, V1PodStatus status) {
        super(message);
        this.status = status;
    }
}
