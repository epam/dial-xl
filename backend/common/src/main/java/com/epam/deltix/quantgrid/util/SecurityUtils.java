package com.epam.deltix.quantgrid.util;

import com.epam.deltix.quantgrid.security.ApiKeyAuthenticationToken;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.security.Principal;

@UtilityClass
public class SecurityUtils {
    public Pair<String, String> getAuthorization(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Principal is missing");
        }

        if (principal instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            Jwt jwt = jwtAuthenticationToken.getToken();
            return Pair.of(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.getTokenValue());
        }

        if (principal instanceof ApiKeyAuthenticationToken apiKeyAuthenticationToken) {
            return Pair.of("api-key", apiKeyAuthenticationToken.getApiKey());
        }

        throw new IllegalArgumentException("Unsupported principal %s".formatted(principal.getClass()));
    }
}
