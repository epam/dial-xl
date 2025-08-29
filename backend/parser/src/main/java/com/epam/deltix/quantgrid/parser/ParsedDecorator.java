package com.epam.deltix.quantgrid.parser;


import com.google.gson.annotations.Expose;

import java.util.ArrayList;
import java.util.List;

public record ParsedDecorator(
        @Expose Span span, @Expose ParsedText name, @Expose List<ParsedPrimitive> params) {
    public String decoratorName() {
        return name.text();
    }

    public static ParsedDecorator from(SheetParser.Decorator_definitionContext context) {
        if (context.exception != null) {
            return null;
        }

        ParsedText decoratorName = ParsedText.from(context.decorator_name());
        List<ParsedPrimitive> arguments = new ArrayList<>(context.primitive().size());
        for (SheetParser.PrimitiveContext primitiveContext : context.primitive()) {
            ParsedPrimitive parsedPrimitive = ParsedPrimitive.from(primitiveContext);
            if (parsedPrimitive == null) {
                return null;
            }

            arguments.add(parsedPrimitive);
        }

        return new ParsedDecorator(Span.from(context), decoratorName, arguments);
    }

    public static List<ParsedDecorator> from(List<SheetParser.Decorator_definitionContext> contexts) {
        List<ParsedDecorator> decorators = new ArrayList<>();
        for (SheetParser.Decorator_definitionContext context : contexts) {
            ParsedDecorator parsedDecorator = ParsedDecorator.from(context);
            if (parsedDecorator != null) {
                decorators.add(parsedDecorator);
            }
        }
        return decorators;
    }
}
