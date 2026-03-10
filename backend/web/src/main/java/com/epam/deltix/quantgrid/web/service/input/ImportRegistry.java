package com.epam.deltix.quantgrid.web.service.input;

import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.quantgrid.input.api.DataDefinition;
import com.epam.quantgrid.input.api.DataInput;
import com.epam.quantgrid.input.api.DataInputs;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.annotation.Nullable;

@Component
public class ImportRegistry {

    private final List<DataDefinition> definitions = new ArrayList<>();
    private final DataDefinition dialDefinition;
    private final DialFileApi dial;
    private final DialInputProvider provider;

    public ImportRegistry(@Nullable DialFileApi dial, @Nullable DialInputProvider provider) {
        DataDefinition dialDefinition = null;

        if (dial != null && provider != null) {
            dialDefinition = DataInputs.createDefinition(DialInput.class);
            definitions.add(dialDefinition);
        }

        definitions.addAll(DataInputs.getDefinitions());
        this.dialDefinition = dialDefinition;
        this.dial = dial;
        this.provider = provider;
    }

    public Collection<DataDefinition> getDefinitions() {
        return definitions;
    }

    public DataDefinition getDefinition(String id) {
        if (dialDefinition != null && dialDefinition.getId().equals(id)) {
            return dialDefinition;
        }

        return DataInputs.getDefinition(id);
    }

    public DataInput createInput(Principal principal, String id, String json) {
        if (dialDefinition != null && dialDefinition.getId().equals(id)) {
            DialInput input = DataInputs.createInput(DialInput.class, json);
            input.setPrincipal(principal);
            input.setDial(dial);
            input.setProvider(provider);
            return input;
        }

        return DataInputs.createInput(id, json);
    }
}
