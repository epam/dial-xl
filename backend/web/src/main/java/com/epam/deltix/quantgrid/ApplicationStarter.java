package com.epam.deltix.quantgrid;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.MultipartAutoConfiguration;

// MultipartAutoConfiguration has to be disabled for FileUploadController to work properly.
// The controller redirects request input stream to a DIAL Core server.
// If MultipartAutoConfiguration is on then stream will be consumed by Spring.
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class, MultipartAutoConfiguration.class})
public class ApplicationStarter {

    public static void main(String[] args) {
        SpringApplication.run(ApplicationStarter.class, args);
    }
}
