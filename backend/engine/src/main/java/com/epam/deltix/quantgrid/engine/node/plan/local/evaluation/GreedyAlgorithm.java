package com.epam.deltix.quantgrid.engine.node.plan.local.evaluation;

import java.util.BitSet;

public class GreedyAlgorithm implements EvaluationAlgorithm {
    private static final BitSet EMPTY_BIT_SET = new BitSet();

    @Override
    public int[] evaluate(int maxTokens,
                          int fieldsCount,
                          int questionsCount,
                          int[] tokensCostPerField,
                          double[][] recallByField,
                          BitSet[][] questionMaskByField) {
        return evaluate(maxTokens, fieldsCount, questionsCount, tokensCostPerField, recallByField, questionMaskByField,
                0, new int[fieldsCount]);
    }

    @Override
    public int[] evaluate(int maxTokens, int fieldsCount, int questionsCount, int[] tokensCostPerField,
                          double[][] recallByField, BitSet[][] questionMaskByField, int currentAnsweredQuestions,
                          int[] currentSelectedN) {
        int[][] nByQuestionForField = new int[questionsCount][fieldsCount];
        for (int field = 0; field < fieldsCount; ++field) {
            for (int n = 0; n < questionMaskByField[field].length; ++n) {
                BitSet prevMask = n == 0 ? EMPTY_BIT_SET : questionMaskByField[field][n - 1];

                BitSet diff = (BitSet) prevMask.clone();
                diff.xor(questionMaskByField[field][n]);

                final int finalField = field;
                final int finalN = n;
                diff.stream().forEach(bit -> {
                    nByQuestionForField[bit][finalField] = finalN;
                });
            }
        }

        boolean[] usedQuestion = new boolean[questionsCount];
        int[] selectedN = new int[fieldsCount];
        int remainingTokens = maxTokens - 1;
        for (int i = 0; i < questionsCount; ++i) {
            int bestQuestion = -1;
            int bestTokenPrice = -1;

            for (int question = 0; question < questionsCount; ++question) {
                if (usedQuestion[question]) {
                    continue;
                }

                int tokenPrice = 0;
                for (int field = 0; field < fieldsCount; ++field) {
                    int n = nByQuestionForField[question][field];

                    if (n > selectedN[field]) {
                        tokenPrice += (n - selectedN[field]) * tokensCostPerField[field];
                    }
                }

                if (tokenPrice <= remainingTokens && (bestQuestion == -1 || bestTokenPrice > remainingTokens)) {
                    bestQuestion = question;
                    bestTokenPrice = tokenPrice;
                }
            }

            if (bestQuestion == -1) {
                break;
            }

            usedQuestion[bestQuestion] = true;
            remainingTokens -= bestTokenPrice;

            for (int field = 0; field < fieldsCount; ++field) {
                selectedN[field] = Math.max(selectedN[field], nByQuestionForField[bestQuestion][field]);
            }
        }

        return selectedN;
    }
}
