package com.epam.deltix.quantgrid.parser.ast;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public enum UnaryOperation {
    NEG("-"), NOT("NOT");

    private static final Map<String, UnaryOperation> OPERATIONS = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(UnaryOperation::getSymbol, Function.identity()));

    private final String symbol;

    public static UnaryOperation parse(String text) {
        UnaryOperation operation = OPERATIONS.get(text);
        if (operation == null) {
            throw new IllegalArgumentException(text);
        }

        return operation;
    }
}
