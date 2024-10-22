package com.epam.deltix.quantgrid.parser.ast;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public enum BinaryOperation {
    ADD("+", false, false),
    SUB("-", false, false),
    MUL("*", false, false),
    DIV("/", false, false),
    POW("^", false, false),
    LT("<", true, true),
    GT(">", true, true),
    LTE("<=", true, true),
    GTE(">=", true, true),
    NEQ("<>", true, true),
    EQ("=", true, true),
    AND("AND", false, true),
    OR("OR", false, true),
    MOD("MOD", false, false),
    CONCAT("&", true, false);

    private static final Map<String, BinaryOperation> OPERATIONS = Arrays.stream(BinaryOperation.values())
            .collect(Collectors.toUnmodifiableMap(BinaryOperation::getSymbol, Function.identity()));

    private final String symbol;
    private final boolean allowStrings;
    private final boolean isLogical;

    public static BinaryOperation parse(String s) {
        BinaryOperation operation = OPERATIONS.get(s);
        if (operation == null) {
            throw new IllegalArgumentException(s);
        }

        return operation;
    }
}