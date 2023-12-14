package com.epam.deltix.quantgrid.engine.compiler.function;

public record Argument(String name, String description, boolean repeatable, boolean optional) {

    public Argument(String name, String description) {
        this(name, description, false);
    }

    public Argument(String name, String description, boolean repeatable) {
        this(name, description, repeatable, false);
    }
}