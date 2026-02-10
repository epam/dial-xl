package com.epam.deltix.quantgrid.web.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "web.storage.dial.sync")
public record SyncSettings(Airbyte airbyte) {
    public record Airbyte(
            String destinationImage,
            String destinationSecret,
            Kubernetes k8s,
            List<AirbyteDefinition> sourceDefinitions) {
    }

    public record Kubernetes(
            String namespace, String purpose, String pullPolicy, Duration cleanupInterval) {
    }

    public record AirbyteDefinition(
            String id, String name, String image, String secret, @DefaultValue("true") boolean enabled) {
    }
}
