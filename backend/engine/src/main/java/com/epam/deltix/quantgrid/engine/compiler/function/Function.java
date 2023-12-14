package com.epam.deltix.quantgrid.engine.compiler.function;

import java.util.List;

public record Function(String name, String description, List<Argument> arguments) {

    public Function(String name, String description, Argument... arguments) {
        this(name, description, List.of(arguments));
    }
}