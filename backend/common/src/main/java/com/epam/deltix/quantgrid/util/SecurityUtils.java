package com.epam.deltix.quantgrid.util;

import com.epam.deltix.quantgrid.security.DialAuth;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.tuple.Pair;

import java.security.Principal;

@UtilityClass
public class SecurityUtils {
    public Pair<String, String> getAuthorization(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Principal is missing");
        }

        if (principal instanceof DialAuth auth) {
            return Pair.of(auth.getKey(), auth.getValue());
        }

        throw new IllegalArgumentException("Unsupported principal %s".formatted(principal.getClass()));
    }
}
