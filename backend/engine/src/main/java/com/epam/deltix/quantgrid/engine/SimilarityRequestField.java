package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.parser.FieldKey;
import org.jetbrains.annotations.Nullable;

public record SimilarityRequestField(FieldKey key, @Nullable FieldKey descriptionKey, int n) {
}