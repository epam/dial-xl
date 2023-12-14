package com.epam.deltix.quantgrid.service.parser;

import lombok.EqualsAndHashCode;
import lombok.Value;

@Value
public class OverrideValue {

    public static final OverrideValue NA = new OverrideValue(null);
    public static final OverrideValue MISSING = new OverrideValue(null);

    String text;
    double number;

    public OverrideValue(String text) {
        this.text = text;
        this.number = Double.NaN;
    }

    public OverrideValue(long number) {
        this(Long.toString(number), number);
    }

    public OverrideValue(String text, double number) {
        this.text = text;
        this.number = number;
    }

    @EqualsAndHashCode.Include
    public boolean isMissing() {
        return this == MISSING;
    }

    public double getDouble() {
        return number;
    }

    public String getString() {
        return text;
    }

    @Override
    public String toString() {
        return text == null ? "NA" : text;
    }
}
