package com.epam.deltix.quantgrid.web.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@AllArgsConstructor
public class DialAuthFilter extends OncePerRequestFilter {
    private static final String API_KEY = "api-key";

    private final RequestAttributeSecurityContextRepository repository = new RequestAttributeSecurityContextRepository();
    private final AuthenticationManager manager;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
            String apiKey = request.getHeader(API_KEY);

            DialToken token = token(authorization, apiKey);
            Authentication auth = manager.authenticate(token);

            // see: https://github.com/spring-projects/spring-security/issues/12758
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);

            SecurityContextHolder.setContext(context);
            repository.saveContext(context, request, response);
        } catch (AuthenticationException e) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private DialToken token(String authorization, String apikey) {
        if (authorization == null && apikey == null) {
            throw new BadCredentialsException("Authorization or Api-Key must be provided");
        }

        if (authorization != null && apikey != null) {
            throw new BadCredentialsException("Both Authorization and Api-Key are provided");
        }

        if (authorization != null) {
            return new DialToken(HttpHeaders.AUTHORIZATION, authorization);
        }

        return new DialToken(API_KEY, apikey);
    }
}