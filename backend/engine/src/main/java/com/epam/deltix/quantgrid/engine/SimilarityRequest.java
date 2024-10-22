package com.epam.deltix.quantgrid.engine;

import java.util.Set;

public record SimilarityRequest(String query,
                                Set<SimilarityRequestField> fields,
                                String modelName,
                                boolean useEvaluation) {
}