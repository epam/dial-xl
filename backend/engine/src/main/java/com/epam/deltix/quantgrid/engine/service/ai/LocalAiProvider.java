package com.epam.deltix.quantgrid.engine.service.ai;

import java.security.Principal;
import java.util.List;

public class LocalAiProvider implements AiProvider {
    @Override
    public List<String> models(Principal principal) {
        throw new UnsupportedOperationException("Not supported");
    }

    @Override
    public String generate(Principal principal, String model, String instruction, String prompt) {
        throw new UnsupportedOperationException("Not supported");
    }
}