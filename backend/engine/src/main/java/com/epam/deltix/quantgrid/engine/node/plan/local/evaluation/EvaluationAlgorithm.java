package com.epam.deltix.quantgrid.engine.node.plan.local.evaluation;

import java.util.BitSet;

public interface EvaluationAlgorithm {
    int[] evaluate(int maxTokens,
                   int fieldsCount,
                   int questionsCount,
                   int[] tokensCostPerField,
                   double[][] recallByField,
                   BitSet[][] questionMaskByField);

    int[] evaluate(int maxTokens,
                   int fieldsCount,
                   int questionsCount,
                   int[] tokensCostPerField,
                   double[][] recallByField,
                   BitSet[][] questionMaskByField,
                   int currentAnsweredQuestions,
                   int[] currentSelectedN);
}
