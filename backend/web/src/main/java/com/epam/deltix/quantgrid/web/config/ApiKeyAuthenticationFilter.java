package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.security.ApiKeyAuthenticationToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@AllArgsConstructor
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    private static final String HEADER_NAME = "api-key";

    private final AuthenticationManager authenticationManager;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String apiKey = request.getHeader(HEADER_NAME);
        if (apiKey != null) {
            ApiKeyAuthenticationToken authRequest = new ApiKeyAuthenticationToken(apiKey);
            try {
                SecurityContextHolder.getContext().setAuthentication(authenticationManager.authenticate(authRequest));
            } catch (AuthenticationException e) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}