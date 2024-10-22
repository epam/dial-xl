package com.epam.deltix.quantgrid.engine.compiler.function;

import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;

import java.util.List;

public record Function(String name, String description, List<FunctionType> functionTypes, List<Argument> arguments) {
    public Function(String name, String description, List<FunctionType> functionTypes, Argument... arguments) {
        this(name, description, functionTypes, List.of(arguments));
    }

    public String getArgumentName(int index) {
        if (index < 0) {
            throw new IllegalArgumentException("Argument index is out of bounds: " + index);
        }

        if (index < arguments.size()) {
            return arguments.get(index).name();
        }

        Argument last = arguments.get(arguments.size() - 1);
        if (last.repeatable()) {
            return last.name();
        }

        throw new IllegalArgumentException("Argument index is out of bounds: " + index);
    }

    public void verifyArgumentCount(int count) {
        if (arguments.isEmpty()) {
            CompileUtil.verify(count == 0,
                    "Function %s does not accept any arguments, but %d were provided", name, count);
        } else {
            int required = arguments.size();
            for (int i = arguments.size() - 1; i >= 0 && arguments.get(i).optional(); i--) {
                required--;
            }

            Argument last = arguments.get(arguments.size() - 1);
            if (last.repeatable()) {
                CompileUtil.verify(count >= required,
                        "Function %s expects at least %d argument%s - %s, but %d were provided",
                        name, required, required == 1 ? "": "s", formatArguments(), count);
            } else if (last.optional()) {
                CompileUtil.verify(required <= count && count <= arguments.size(),
                        "Function %s expects from %d to %d arguments - %s, but %d were provided",
                        name, required, arguments.size(), formatArguments(), count);
            } else {
                CompileUtil.verify(count == required,
                        "Function %s expects %d argument%s - %s, but %d were provided",
                        name, required, required == 1 ? "": "s", formatArguments(), count);
            }
        }
    }

    private String formatArguments() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < arguments.size(); ++i) {
            if (i > 0) {
                builder.append(i + 1 == arguments.size() ? " and " : ", ");
            }
            Argument argument = arguments.get(i);
            builder.append(formatArgument(argument));
        }

        return builder.toString();
    }

    private static String formatArgument(Argument argument) {
        String formatted = "\"" + argument.name() + "\"";

        if (argument.repeatable()) {
            formatted += " (repeatable)";
        }

        if (argument.optional()) {
            formatted += " (optional)";
        }

        return formatted;
    }
}