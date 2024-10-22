package com.epam.deltix.quantgrid.web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;

import javax.annotation.Nullable;

@EnableWebSecurity
@Configuration
public class AuthConfig {

    @Bean
    @ConditionalOnProperty(value="spring.security.enabled", havingValue = "true")
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
            String jwkUri,
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
                // 1. The ApiKeyAuthenticationFilter checks for the presence of the "api-key"
                // header and attempts to authenticate the user based on the value of the header.
                // The API key validation is implemented in the ApiKeyAuthenticationProvider (called via AuthenticationManager).
                // To validate the key, the provider makes a request to DIAL to get the bucket URL for the provided key.
                // If the bucket request is successful, the user is authenticated.
                // 2. If the "api-key" header is not present, the request is passed to BearerTokenAuthenticationFilter
                // to authenticate the user via JWK URI if the bearer token is present.
                // 3. If the request is not authenticated, the user receives a 401 Unauthorized response.
                .addFilterBefore(
                        new ApiKeyAuthenticationFilter(authenticationManager),
                        AbstractPreAuthenticatedProcessingFilter.class)
                .oauth2ResourceServer()
                .jwt()
                .jwkSetUri(jwkUri)
                .and();
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

    @Bean
    @Nullable
    @ConditionalOnProperty(value = "spring.security.enabled", havingValue = "false")
    public JwtDecoder jwtDecoder() {
        return null; // oath2 configuration tries to initialize it because we set property from ENV vars
    }
}
