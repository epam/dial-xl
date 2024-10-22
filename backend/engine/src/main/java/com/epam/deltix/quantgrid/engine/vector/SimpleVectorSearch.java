package com.epam.deltix.quantgrid.engine.vector;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.vector.model.DataScore;
import com.epam.deltix.quantgrid.engine.vector.model.VectorData;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.PriorityQueue;

public class SimpleVectorSearch {
    private record VectorDataScore(DoubleColumn vector, String data, @Nullable String description, double score) implements Comparable<VectorDataScore> {
        @Override
        public int compareTo(@NotNull SimpleVectorSearch.VectorDataScore o) {
            return Double.compare(score, o.score);
        }
    }

    public static List<DataScore> calculateDocumentScores(VectorData[] documents, DoubleColumn query) {
        List<DataScore> result = new ArrayList<>();
        for (VectorData document : documents) {
            result.add(new DataScore(
                    document.data(),
                    document.description(),
                    VectorUtils.calculateSimilarity(document.vector(), query)
            ));
        }

        return result;
    }

    public static List<DataScore> findNClosestVectors(VectorData[] documents, DoubleColumn query, int n) {
        PriorityQueue<VectorDataScore> queue = new PriorityQueue<>();
        for (VectorData document : documents) {
            queue.offer(new VectorDataScore(document.vector(), document.data(), document.description(), VectorUtils.calculateSimilarity(document.vector(), query)));

            if (queue.size() > n) {
                queue.poll();
            }
        }

        List<DataScore> result = new ArrayList<>();
        for (VectorDataScore vectorScore : queue) {
            result.add(new DataScore(vectorScore.data(), vectorScore.description(), vectorScore.score));
        }

        return result;
    }
}
