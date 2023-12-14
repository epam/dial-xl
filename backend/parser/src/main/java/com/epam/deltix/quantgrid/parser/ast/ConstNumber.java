package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(callSuper = false)
public class ConstNumber extends Formula {
    double number;
}

