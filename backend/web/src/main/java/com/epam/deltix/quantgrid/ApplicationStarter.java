package com.epam.deltix.quantgrid;

import com.epam.deltix.gflog.jul.JulBridge;
import com.epam.deltix.quantgrid.web.config.SyncSettings;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.MultipartAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;

// MultipartAutoConfiguration has to be disabled for FileUploadController to work properly.
// The controller redirects request input stream to a DIAL Core server.
// If MultipartAutoConfiguration is on then stream will be consumed by Spring.
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class, MultipartAutoConfiguration.class})
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
