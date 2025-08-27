package com.epam.deltix.quantgrid.engine.embeddings;

import lombok.Getter;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EmbeddingModels {
    public static final List<String> MODEL_NAMES = List.of("bge-small-en-v1.5", "multilingual-e5-small");

    @Getter
    private static final Map<String, EmbeddingModel> models = new HashMap<>();

    static {
        String modelsFolder = System.getProperty("qg.embedding.models.path", "embedding_models");
        String executionModeHint = System.getProperty("qg.embedding.execution.mode", "PERFORMANCE");
        try {
            for (String modelName : MODEL_NAMES) {
                models.put(modelName, EmbeddingModel.load(Path.of(modelsFolder), modelName, executionModeHint));
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static void load() {
        MODEL_NAMES.size(); // preload
    }

    private static String getQueryPrefix(String name) {
        return switch (name) {
            case "bge-small-en-v1.5" -> "";
            case "multilingual-e5-small" -> "query: ";
            default -> throw new IllegalArgumentException("Unknown model");
        };
    }

    private static String getDocumentPrefix(String name) {
        return switch (name) {
            case "bge-small-en-v1.5" -> "";
            case "multilingual-e5-small" -> "passage: ";
            default -> throw new IllegalArgumentException("Unknown model");
        };
    }

    public static String getPrefix(String modelName, EmbeddingType embeddingType) {
        if (embeddingType == EmbeddingType.QUERY) {
            return getQueryPrefix(modelName);
        } else {
            return getDocumentPrefix(modelName);
        }
    }
}
