package com.epam.deltix.quantgrid.engine.node.plan.local.evaluation;

import java.util.BitSet;

public class RecursiveAlgorithm implements EvaluationAlgorithm {
    private int bestAnswer;
    private int[] bestSelectedN;
    private int fieldsCount;
    private BitSet[][] questionMaskByField;

    private void go(int field, BitSet mask, int[] selectedN) {
        if (field == fieldsCount) {
            int answeredQuestions = mask.cardinality();
            if (answeredQuestions > bestAnswer) {
                bestAnswer = answeredQuestions;
                System.arraycopy(selectedN, 0, bestSelectedN, 0, fieldsCount);
            }

            return;
        }

        for (int n = 0; n < questionMaskByField[field].length; ++n) {
            BitSet newMask = (BitSet) mask.clone();
            newMask.and(questionMaskByField[field][n]);

            if (bestAnswer >= newMask.cardinality()) {
                continue;
            }

            selectedN[field] = n;
            go(field + 1, newMask, selectedN);
        }
    }

    @Override
    public int[] evaluate(int maxTokens,
                          int fieldsCount,
                          int questionsCount,
                          int[] tokensCostPerField,
                          double[][] recallByField,
                          BitSet[][] questionMaskByField) {
        return evaluate(maxTokens, fieldsCount, questionsCount, tokensCostPerField, recallByField, questionMaskByField,
                -1, new int[fieldsCount]);
    }

    @Override
    public int[] evaluate(int maxTokens, int fieldsCount, int questionsCount, int[] tokensCostPerField,
                          double[][] recallByField, BitSet[][] questionMaskByField, int currentAnsweredQuestions,
                          int[] currentSelectedN) {
        this.bestAnswer = currentAnsweredQuestions;
        this.bestSelectedN = currentSelectedN;
        this.questionMaskByField = questionMaskByField;
        this.fieldsCount = fieldsCount;

        BitSet initMask = new BitSet(questionsCount);
        initMask.set(0, questionsCount, true);
        go(0, initMask, new int[fieldsCount]);

        return bestSelectedN;
    }
}
