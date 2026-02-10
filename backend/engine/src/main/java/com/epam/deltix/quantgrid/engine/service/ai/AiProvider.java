package com.epam.deltix.quantgrid.engine.service.ai;

import java.security.Principal;
import java.util.List;

public interface AiProvider {

    List<String> models(Principal principal);

    String generate(Principal principal, String model, String instruction, String prompt);
}