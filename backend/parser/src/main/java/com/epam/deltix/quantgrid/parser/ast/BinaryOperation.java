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
    ADD("+", false),
    SUB("-", false),
    MUL("*", false),
    DIV("/", false),
    POW("^", false),
    LT("<", true),
    GT(">", true),
    LTE("<=", true),
    GTE(">=", true),
    NEQ("<>", true),
    EQ("=", true),
    AND("AND", false),
    OR("OR", false),
    MOD("MOD", false),
    CONCAT("&", true);

    private static final Map<String, BinaryOperation> OPERATIONS = Arrays.stream(BinaryOperation.values())
            .collect(Collectors.toUnmodifiableMap(BinaryOperation::getSymbol, Function.identity()));

    private final String symbol;
    private final boolean allowStrings;

    public static BinaryOperation parse(String s) {
        BinaryOperation operation = OPERATIONS.get(s);
        if (operation == null) {
            throw new IllegalArgumentException(s);
        }

        return operation;
    }
}