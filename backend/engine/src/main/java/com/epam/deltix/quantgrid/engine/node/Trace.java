package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.Span;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
public class Trace {
    long id;
    Type type;
    ParsedKey key;
    String sheet;
    String text;
    int start;
    int end;

    public Trace(long id, Type type, ParsedKey key, Span span) {
        this(id, type, key, span.sheet(), span.text(), span.from(), span.to());
    }

    public Trace(long id, Type type, ParsedKey key, String sheet, String text, int start, int end) {
        this.id = id;
        this.type = type;
        this.key = key;
        this.sheet = sheet;
        this.text = text;
        this.start = start;
        this.end = end;
    }

    public enum Type {
        COMPUTE, INDEX
    }
}