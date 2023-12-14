package com.epam.deltix.quantgrid.parser.ast;

import lombok.Getter;

public enum BinaryOperation {
    ADD(false, false),
    SUB(false, false),
    MUL(false, false),
    DIV(false, false),
    POW(false, false),
    LT(true, true),
    GT(true, true),
    LTE(true, true),
    GTE(true, true),
    NEQ(true, true),
    EQ(true, true),
    AND(false, true),
    OR(false, true),
    MOD(false, false);

    @Getter
    private final boolean allowStrings;
    @Getter
    private final boolean isLogical;

    BinaryOperation(boolean allowStrings, boolean isLogical) {
        this.allowStrings = allowStrings;
        this.isLogical = isLogical;
    }

    public static BinaryOperation parse(String s) {
        return switch (s) {
            case "+" -> ADD;
            case "-" -> SUB;
            case "*" -> MUL;
            case "/" -> DIV;
            case "^" -> POW;
            case "<" -> LT;
            case ">" -> GT;
            case "<=" -> LTE;
            case ">=" -> GTE;
            case "<>" -> NEQ;
            case "==" -> EQ;
            case "AND" -> AND;
            case "OR" -> OR;
            case "MOD" -> MOD;
            default -> throw new IllegalArgumentException(s);
        };
    }
}