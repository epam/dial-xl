package com.epam.deltix.quantgrid.engine.node.expression;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum SubstringFunction {
    LEFT(2), RIGHT(2), MID(3);

    private final int argumentsCount; // the number of expressions/columns for function
}
