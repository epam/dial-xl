package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Getter
@Accessors(fluent = true)
@EqualsAndHashCode
public abstract class Formula {
    private final List<Formula> arguments;

    Formula() {
        this.arguments = List.of();
    }

    Formula(Formula... arguments) {
        this.arguments = List.of(arguments);
    }
}
