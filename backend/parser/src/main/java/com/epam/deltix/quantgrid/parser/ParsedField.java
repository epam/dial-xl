package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Builder;
import lombok.Value;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;

import java.util.List;


@Slf4j
@Builder
@Value
@Accessors(fluent = true)
public class ParsedField {
    @Expose
    Span span;
    @Expose
    ParsedText key;
    @Expose
    ParsedText dim;
    @Expose
    ParsedText name;
    @Expose
    @Builder.Default
    List<ParsedDecorator> decorators = List.of();
    @Expose
    @Builder.Default
    List<ParsedText> docs = List.of();

    public boolean isKey() {
        return key != null;
    }

    public boolean isDim() {
        return dim != null;
    }

    public String fieldName() {
        return name.text();
    }
}
