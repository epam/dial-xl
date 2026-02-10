package com.epam.deltix.quantgrid.engine.service.input;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum InputType {
    CSV(".csv");

    @Getter
    private final String extension;

    public static InputType fromName(String inputName) {
        if (inputName.endsWith(CSV.getExtension())) {
            return CSV;
        } else {
            throw new UnsupportedOperationException("Unsupported input file: " + inputName);
        }
    }
}
