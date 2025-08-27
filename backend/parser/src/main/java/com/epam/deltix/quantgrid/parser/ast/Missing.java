package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;

@Getter
public class Missing extends Formula {

    public Missing(Span span) {
        super(span);
    }

    @Override
    public String toString() {
        return "Missing";
    }
}
