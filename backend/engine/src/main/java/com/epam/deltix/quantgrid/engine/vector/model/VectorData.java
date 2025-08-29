package com.epam.deltix.quantgrid.engine.vector.model;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import org.jetbrains.annotations.Nullable;

public record VectorData(DoubleColumn vector, String data, @Nullable String description) { }
