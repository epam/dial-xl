package com.epam.deltix.quantgrid;

import com.epam.deltix.gflog.jul.JulBridge;
import com.epam.deltix.quantgrid.web.config.SyncSettings;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
// Enable to allow immutable configuration properties binding
@EnableConfigurationProperties(SyncSettings.class)
// Enable caching support (e.g. for airbyte source specs)
@EnableCaching
public class ApplicationStarter {

    public static void main(String[] args) {

        // disables Spring Logging System, so we solely rely on GF Log
       // System.setProperty("org.springframework.boot.logging.LoggingSystem", "none");
        JulBridge.install();
        SpringApplication.run(ApplicationStarter.class, args);
    }
}
