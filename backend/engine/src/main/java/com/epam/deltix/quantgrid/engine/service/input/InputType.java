package com.epam.deltix.quantgrid.engine.service.input;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;

@RequiredArgsConstructor
public enum InputType {
    CSV(".csv");

    @Getter
    private final String extension;

    public static InputType fromName(String inputName) {
        if (StringUtils.endsWithIgnoreCase(inputName, CSV.getExtension())) {
            return CSV;
        } else {
            throw new UnsupportedOperationException("Unsupported input file: " + inputName);
        }
    }
}
