package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class ConstText extends Formula {
    private final String text;

    public ConstText(String text) {
        this(null, text);
    }

    public ConstText(Span span, String text) {
        super(span);
        this.text = text;
    }

    @Override
    public String toString() {
        return "ConstText(span=" + span() + ", text=" + text + ")";
    }
}
