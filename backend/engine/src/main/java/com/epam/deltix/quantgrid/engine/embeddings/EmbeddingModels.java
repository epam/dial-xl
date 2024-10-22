package com.epam.deltix.quantgrid.engine.embeddings;

import ai.djl.MalformedModelException;
import ai.djl.huggingface.translator.TextEmbeddingTranslatorFactory;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ModelNotFoundException;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.training.util.ProgressBar;
import lombok.Getter;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EmbeddingModels {
    public final static List<String> MODEL_NAMES = List.of("bge-small-en-v1.5", "multilingual-e5-small");

    @Getter
    private final static Map<String, ZooModel<String, float[]>> models = new HashMap<>();

    static {
        for (String modelName : MODEL_NAMES) {
            Criteria<String, float[]> criteria =
                    Criteria.builder()
                            .setTypes(String.class, float[].class)
                            .optModelUrls("jar:///%s.zip".formatted(modelName))
                            .optEngine("PyTorch")
                            .optTranslatorFactory(new TextEmbeddingTranslatorFactory())
                            .optProgress(new ProgressBar())
                            .build();

            ZooModel<String, float[]> model;
            try {
                model = criteria.loadModel();

                models.put(modelName, model);
            } catch (IOException | ModelNotFoundException | MalformedModelException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static ZooModel<String, float[]> getModel(String name) {
        return models.getOrDefault(name, null);
    }

    public static String getQueryPrefix(String name) {
        return switch (name) {
            case "bge-small-en-v1.5" -> "";
            case "multilingual-e5-small" -> "query: ";
            default -> throw new IllegalArgumentException("Unknown model");
        };
    }

    public static String getDocumentPrefix(String name) {
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
