package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;

@Getter
public class QueryRow extends Formula {

    public QueryRow() {
        this(null);
    }

    public QueryRow(Span span) {
        super(span);
    }

    @Override
    public String toString() {
        return "QueryRow";
    }
}
