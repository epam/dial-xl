package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.security.ApiKeyAuthenticationToken;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;

public class ApiKeyAuthenticationProvider implements AuthenticationProvider {
    private static final String BUCKET_ENDPOINT = "/v1/bucket";

    private final URL bucketUrl;
    private final OkHttpClient httpClient;

    public ApiKeyAuthenticationProvider(String dialBaseUrl, OkHttpClient httpClient) throws MalformedURLException {
        this.bucketUrl = URI.create(dialBaseUrl).resolve(BUCKET_ENDPOINT).toURL();
        this.httpClient = httpClient;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        if (authentication instanceof ApiKeyAuthenticationToken token) {
            validate(token.getApiKey());
            authentication.setAuthenticated(true);

            return authentication;
        }
        return null;
    }

    private void validate(String key) {
        if (key == null || key.isEmpty()) {
            throw new BadCredentialsException("API key is required");
        }

        Request request = new Request.Builder()
                .url(bucketUrl)
                .header("api-key", key)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (response.code() != 200) {
                throw new BadCredentialsException("Invalid API key");
            }
        } catch (IOException e) {
            throw new AuthenticationServiceException("Failed to validate API key", e);
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return ApiKeyAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
