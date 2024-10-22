package com.epam.deltix.quantgrid.web.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.annotation.Nullable;

@Configuration
@ConditionalOnDialStorageEnabled
@ConfigurationProperties(prefix = "web.storage.dial")
@Getter
@Setter
public class DialStorageSettings {
    @Value("${web.storage.dial.endpoint:#{null}}")
    @Nullable
    private String endpoint;
}
