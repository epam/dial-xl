package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(callSuper = false)
@ToString
public class CurrentField extends Formula {
    String field;
}
