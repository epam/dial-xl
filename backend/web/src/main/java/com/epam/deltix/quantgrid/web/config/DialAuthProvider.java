package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.security.DialAuth;
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

public class DialAuthProvider implements AuthenticationProvider {
    private static final String BUCKET_ENDPOINT = "/v1/bucket";

    private final URL bucketUrl;
    private final OkHttpClient httpClient;

    public DialAuthProvider(String dialBaseUrl, OkHttpClient httpClient) throws MalformedURLException {
        this.bucketUrl = URI.create(dialBaseUrl).resolve(BUCKET_ENDPOINT).toURL();
        this.httpClient = httpClient;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        if (authentication instanceof DialAuth auth) {
            validate(auth);
            authentication.setAuthenticated(true);
            return authentication;
        }

        return null;
    }

    private void validate(DialAuth auth) {
        Request request = new Request.Builder()
                .url(bucketUrl)
                .header(auth.getKey(), auth.getValue())
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (response.code() != 200) {
                throw new BadCredentialsException("Invalid credentials");
            }
        } catch (IOException e) {
            throw new AuthenticationServiceException("Failed to validate credentials", e);
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return DialToken.class.isAssignableFrom(authentication);
    }
}
