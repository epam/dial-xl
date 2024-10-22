package com.epam.deltix.quantgrid.engine.node.plan.local.evaluation;

import java.util.BitSet;

public class DynamicProgrammingAlgorithm implements EvaluationAlgorithm {
    private final int MAX_SUPPORTED_QUESTIONS = 15;

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
                          double[][] recallByField, BitSet[][] questionMaskByFieldBitSet, int currentAnsweredQuestions,
                          int[] currentSelectedN) {
        double[][][] bestRecall = new double[fieldsCount + 1][1 << questionsCount][maxTokens];
        int[][][] lastSelectedN = new int[fieldsCount + 1][1 << questionsCount][maxTokens];
        int[][][] prevMask = new int[fieldsCount + 1][1 << questionsCount][maxTokens];

        lastSelectedN[0][(1 << questionsCount) - 1][0] = -1;

        if (questionsCount > MAX_SUPPORTED_QUESTIONS) {
            throw new IllegalArgumentException("Unsupported number of questions: " + questionsCount);
        }

        int[][] questionMaskByField = new int[questionMaskByFieldBitSet.length][];
        for (int i = 0; i < questionMaskByFieldBitSet.length; ++i) {
            questionMaskByField[i] = new int[questionMaskByFieldBitSet[i].length];
            for (int j = 0; j < questionMaskByFieldBitSet[i].length; ++j) {
                questionMaskByField[i][j] = (int) questionMaskByFieldBitSet[i][j].toLongArray()[0];
            }
        }

        for (int field = 0; field < fieldsCount; ++field) {
            for (int mask = 0; mask < (1 << questionsCount); ++mask) {
                for (int tokens = 0; tokens < maxTokens; ++tokens) {
                    if (lastSelectedN[field][mask][tokens] == 0) {
                        continue;
                    }

                    int remainingTokens = (maxTokens - 1) - tokens;
                    int maxNext = Math.min(recallByField[field].length, remainingTokens / tokensCostPerField[field]);
                    for (int n = 0; n < maxNext; ++n) {
                        double newBestRecall = bestRecall[field][mask][tokens] + recallByField[field][n];
                        int newMask = mask & questionMaskByField[field][n];
                        int newTokens = tokens + n * tokensCostPerField[field];

                        if (bestRecall[field + 1][newMask][newTokens] < newBestRecall) {
                            bestRecall[field + 1][newMask][newTokens] = newBestRecall;
                            lastSelectedN[field + 1][newMask][newTokens] = n;
                            prevMask[field + 1][newMask][newTokens] = mask;
                        }
                    }
                }
            }
        }

        int maxAnsweredQuestions = -1;
        double maxRecall = -1;
        int bestMask = -1;
        int bestTokens = -1;

        for (int mask = 0; mask < (1 << questionsCount); ++mask) {
            int bitsCount = Integer.bitCount(mask);

            if (bitsCount < maxAnsweredQuestions) {
                continue;
            }

            for (int tokens = 0; tokens < maxTokens; ++tokens) {
                if (lastSelectedN[fieldsCount][mask][tokens] == 0) {
                    continue;
                }

                double recall = bestRecall[fieldsCount][mask][tokens];

                if (bitsCount > maxAnsweredQuestions || recall > maxRecall || (recall == maxRecall && tokens < bestTokens)) {
                    maxAnsweredQuestions = bitsCount;
                    maxRecall = recall;
                    bestMask = mask;
                    bestTokens = tokens;
                }
            }
        }

        int mask = bestMask;
        int tokens = bestTokens;
        int field = fieldsCount;

        int[] results = new int[fieldsCount];
        while (field > 0) {
            int n = lastSelectedN[field][mask][tokens];
            int newMask = prevMask[field][mask][tokens];

            --field;
            mask = newMask;
            tokens -= n * tokensCostPerField[field];

            results[field] = n;
        }

        return results;
    }
}
