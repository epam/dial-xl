package com.epam.deltix.quantgrid.web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import javax.annotation.Nullable;

@EnableWebSecurity
@Configuration
public class AuthConfig {

    @Bean
    @ConditionalOnProperty(value="spring.security.enabled", havingValue = "true")
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationManager authenticationManager) throws Exception {
        http.cors()
                .and()
                .csrf()
                .disable()
                .authorizeHttpRequests()
                .requestMatchers("/health").permitAll()
                .anyRequest()
                .authenticated()
                .and()
                .addFilterBefore(
                        new DialAuthFilter(authenticationManager),
                        AbstractPreAuthenticatedProcessingFilter.class);
        return http.build();
    }

    @Bean
    @ConditionalOnProperty(value="spring.security.enabled", havingValue = "false")
    public SecurityFilterChain disabledSecurityFillerChain(HttpSecurity http) throws Exception {
        http.cors()
                .disable()
                .csrf()
                .disable()
                .authorizeHttpRequests()
                .anyRequest()
                .permitAll();

        return http.build();
    }

    // Disable CORS control when using the local (dev) profile
    @Bean
    @Profile("local")
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("*"));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
