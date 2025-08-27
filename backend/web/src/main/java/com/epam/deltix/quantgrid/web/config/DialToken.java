package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.security.DialAuth;
import lombok.Getter;
import org.springframework.security.authentication.AbstractAuthenticationToken;

@Getter
public class DialToken extends AbstractAuthenticationToken implements DialAuth {

    private final String key;
    private final String value;

    public DialToken(String key, String value) {
        super(null);
        this.key = key;
        this.value = value;
    }

    @Override
    public Object getCredentials() {
        return value;
    }

    @Override
    public Object getPrincipal() {
        return value;
    }
}
