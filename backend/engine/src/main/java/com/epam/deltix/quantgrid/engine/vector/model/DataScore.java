package com.epam.deltix.quantgrid.engine.vector.model;

import org.jetbrains.annotations.Nullable;

public record DataScore(String data, @Nullable String description, double score) { }
