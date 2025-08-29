package com.epam.deltix.quantgrid.security;

import java.security.Principal;

public interface DialAuth extends Principal {
    String getKey();
    String getValue();
}
