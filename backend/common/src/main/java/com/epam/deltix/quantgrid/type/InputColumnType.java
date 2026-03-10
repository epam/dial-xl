package com.epam.deltix.quantgrid.type;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum InputColumnType {
    DOUBLE("Number"), BOOLEAN("Boolean"), DATE("Date"), DATE_TIME("Date Time"), STRING("Text");

    @Getter
    private final String displayName;

    public ColumnType toColumnType() {
        return switch (this) {
            case BOOLEAN, DATE, DOUBLE, DATE_TIME -> ColumnType.DOUBLE;
            case STRING -> ColumnType.STRING;
        };
    }
}
