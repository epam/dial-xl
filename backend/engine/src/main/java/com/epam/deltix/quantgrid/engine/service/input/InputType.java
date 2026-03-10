package com.epam.deltix.quantgrid.engine.service.input;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.Strings;

@RequiredArgsConstructor
public enum InputType {
    CSV(".csv"),
    XLSX(".xlsx");

    @Getter
    private final String extension;

    public static InputType fromName(String inputName) {
        if (Strings.CI.endsWith(inputName, CSV.getExtension())) {
            return CSV;
        } if (Strings.CI.endsWith(inputName, XLSX.getExtension())) {
            return XLSX;
        } else {
            throw new UnsupportedOperationException("Unsupported input file: " + inputName);
        }
    }
}
