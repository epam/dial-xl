package com.epam.deltix.quantgrid.engine.vector;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class VectorUtils {
    public static double dotProduct(DoubleColumn a, DoubleColumn b) {
        double result = 0;
        for (int i = 0; i < a.size(); i++) {
            result += a.get(i) * b.get(i);
        }
        return result;
    }

    public static double normalize(DoubleColumn vector) {
        double result = 0;
        for (int i = 0; i < vector.size(); ++i) {
            result += vector.get(i) * vector.get(i);
        }
        return result;
    }

    public static double calculateSimilarity(DoubleColumn a, DoubleColumn b) {
        return dotProduct(a, b) / (normalize(a) * normalize(b));
    }
}
