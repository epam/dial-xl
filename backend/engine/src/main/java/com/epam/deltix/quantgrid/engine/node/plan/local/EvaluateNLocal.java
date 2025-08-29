package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.node.plan.local.evaluation.EvaluationAlgorithm;
import com.epam.deltix.quantgrid.engine.node.plan.local.evaluation.EvaluationUtils;
import com.epam.deltix.quantgrid.engine.node.plan.local.evaluation.GreedyAlgorithm;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.BitSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Slf4j
public class EvaluateNLocal extends PlanN<Table, Table> {
    private final int MAX_TOKENS = 2001;

    private final int fieldsCount;

    private static List<Source> buildSources(List<Plan.Source> plans,
                                             List<Plan.Source> tokens,
                                             List<Plan.Source> groundTruths,
                                             Plan scalarLayout) {
        List<Source> sources = new ArrayList<>();
        sources.addAll(plans);
        sources.addAll(tokens);
        sources.addAll(groundTruths);
        sources.add(sourceOf(scalarLayout));
        return sources;
    }

    public EvaluateNLocal(List<Plan.Source> plans, List<Plan.Source> tokens, List<Plan.Source> groundTruths,
                          Plan scalarLayout) {
        super(buildSources(plans, tokens, groundTruths, scalarLayout));
        Util.verify(plans.size() == tokens.size());
        Util.verify(tokens.size() == groundTruths.size());
        this.fieldsCount = plans.size();
    }

    @Override
    protected Plan layout() {
        return plan(3 * fieldsCount).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.ofN(ColumnType.DOUBLE, fieldsCount));
    }

    @Override
    protected Table execute(List<Table> tables) {
        int[] tokensCostPerField = new int[fieldsCount];
        for (int i = 0; i < fieldsCount; ++i) {
            // TODO: will be moved to graph MAX node
            int maxTokens = 0;
            DoubleColumn tokens = expression(fieldsCount + i, 0).evaluate();
            for (int j = 0; j < tokens.size(); ++j) {
                maxTokens = (int) Math.max(maxTokens, tokens.get(j));
            }
            tokensCostPerField[i] = maxTokens;
        }

        double[][] recallByField = new double[fieldsCount][];
        BitSet[][] questionMaskByField = new BitSet[fieldsCount][];
        int questionsCount = -1;
        for (int i = 0; i < fieldsCount; ++i) {
            StringColumn groundTruths = expression(2 * fieldsCount + i, 0).evaluate();

            if (questionsCount == -1) {
                questionsCount = (int) groundTruths.size();
            } else {
                if (questionsCount != groundTruths.size()) {
                    throw new IllegalArgumentException("Number of questions is not equals for fields");
                }
            }

            double[] fieldScores = null;
            BitSet[] fieldQuestionMask = null;

            DoubleColumn refs = expression(i, 0).evaluate();
            StringColumn retrieverColumn = expression(i, 1).evaluate();
            int firstUnprocessed = 0;

            for (int questionId = 0; questionId < questionsCount; ++questionId) {
                List<String> groundTruth = EvaluationUtils.parseGroundTruth(groundTruths.get(questionId));
                Set<String> groundTruthSet = new HashSet<>(groundTruth);

                while (firstUnprocessed < refs.size() && refs.get(firstUnprocessed) < questionId) {
                    ++firstUnprocessed;
                }

                int l = firstUnprocessed;
                while (firstUnprocessed < refs.size() && refs.get(firstUnprocessed) == questionId) {
                    ++firstUnprocessed;
                }
                int r = firstUnprocessed;

                if (questionId == 0) {
                    fieldScores = new double[r - l + 1];
                    fieldQuestionMask = new BitSet[r - l + 1];
                    for (int j = 0; j < fieldQuestionMask.length; ++j) {
                        fieldQuestionMask[j] = new BitSet(questionsCount);
                    }
                }

                if (groundTruthSet.isEmpty()) {
                    fieldQuestionMask[0].set(questionId, true);
                } else {
                    for (int j = l; j < r; ++j) {
                        String data = retrieverColumn.get(j);
                        int level = j - l;

                        if (groundTruthSet.contains(data)) {
                            groundTruthSet.remove(data);

                            fieldScores[level + 1] += (double) 1 / groundTruth.size();

                            if (groundTruthSet.isEmpty()) {
                                fieldQuestionMask[level + 1].set(questionId, true);
                            }
                        }
                    }
                }
            }

            for (int j = 1; j < fieldScores.length; ++j) {
                fieldScores[j] += fieldScores[j - 1];
                fieldQuestionMask[j].or(fieldQuestionMask[j - 1]);
            }

            recallByField[i] = fieldScores;
            questionMaskByField[i] = fieldQuestionMask;
        }

        EvaluationAlgorithm evaluationAlgorithm = new GreedyAlgorithm();

        int[] selectedN = evaluationAlgorithm.evaluate(MAX_TOKENS, fieldsCount, questionsCount, tokensCostPerField,
                recallByField, questionMaskByField);

        checkSolution(selectedN, questionsCount, tokensCostPerField,
                recallByField, questionMaskByField);

        Column[] columns = new Column[fieldsCount];
        for (int i = 0; i < fieldsCount; ++i) {
            columns[i] = new DoubleDirectColumn(selectedN[i]);
        }

        return new LocalTable(columns);
    }

    private void checkSolution(int[] selectedN, int questionsCount, int[] tokensCostPerField, double[][] recallByField,
                               BitSet[][] questionMaskByField) {
        log.debug("N: {}", Arrays.toString(selectedN));

        BitSet mask = new BitSet(questionsCount);
        mask.set(0, questionsCount, true);

        double recall = 0;
        int tokens = 0;
        for (int field = 0; field < fieldsCount; ++field) {
            mask.and(questionMaskByField[field][selectedN[field]]);
            recall += recallByField[field][selectedN[field]];
            tokens += tokensCostPerField[field] * selectedN[field];
        }

        log.debug("Answered questions: {}", mask.cardinality());
        log.debug("Recall: {}", recall);
        log.debug("Tokens: {}", tokens);
    }

    @Override
    public String toString() {
        return "EvaluateN()";
    }
}
