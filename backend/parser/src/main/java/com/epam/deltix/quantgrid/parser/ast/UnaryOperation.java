package com.epam.deltix.quantgrid.parser.ast;

public enum UnaryOperation {
    NEG, NOT;

    public static UnaryOperation parse(String text) {
        return switch (text) {
            case "-" -> NEG;
            case "NOT" -> NOT;
            default -> throw new IllegalArgumentException(text);
        };
    }
}
