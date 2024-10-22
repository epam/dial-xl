package com.epam.deltix.quantgrid.engine.compiler.evaluation;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileEvaluationUtils;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.TableKey;
import lombok.experimental.UtilityClass;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@UtilityClass
public class EvaluationUtils {
    public ParsedTable getAndValidateEvaluationTable(Map<ParsedKey, CompileError> compileErrors,
                                                      Map<ParsedKey, Object> parsed,
                                                      List<ParsedTable> tables) {
        ParsedTable evaluationTable = null;

        boolean foundEvalTable = false;
        for (ParsedTable table : tables) {
            if (CompileEvaluationUtils.isEvaluationTable(table)) {
                if (foundEvalTable) {
                    compileErrors.put(new TableKey(table.tableName()), new CompileError("Project must have only one evaluation table"));
                } else {
                    evaluationTable = table;
                    validateEvaluationTable(compileErrors, parsed, table);
                }

                foundEvalTable = true;
            }
        }

        return evaluationTable;
    }

    private void validateEvaluationTable(Map<ParsedKey, CompileError> compileErrors,
                                         Map<ParsedKey, Object> parsed,
                                         ParsedTable table) {
        boolean foundQuestionColumn = false;

        for (ParsedField field : table.fields()) {
            if (CompileEvaluationUtils.isEvaluationQuestion(field)) {
                if (foundQuestionColumn) {
                    compileErrors.put(new TableKey(table.tableName()), new CompileError("Evaluation table must have only one question field"));
                }

                foundQuestionColumn = true;
            } else if (CompileEvaluationUtils.isEvaluationField(field)) {
                boolean foundEvaluationDecorator = false;

                for (ParsedDecorator decorator : field.decorators()) {
                    if (!decorator.decoratorName().equals(CompileEvaluationUtils.EVALUATION_FIELD_DECORATOR)) {
                        continue;
                    }

                    if (foundEvaluationDecorator) {
                        compileErrors.put(new FieldKey(table.tableName(), field.fieldName()), new CompileError("Field must have only one evaluation_field decorator"));
                    }

                    foundEvaluationDecorator = true;
                }
            }
        }

        List<CompileEvaluationUtils.EvaluationField> fields = CompileEvaluationUtils.getEvaluationFields(table);

        Set<FieldKey> groundTruths = new HashSet<>();
        for (CompileEvaluationUtils.EvaluationField field : fields) {
            if (!parsed.containsKey(field.field())) {
                compileErrors.put(field.groundTruth(), new CompileError("Incorrect table or field name specified in the evaluation_field decorator"));
            } else {
                if (!groundTruths.add(field.field())) {
                    compileErrors.put(field.groundTruth(), new CompileError("Duplicated field in the evaluation_field decorator"));
                }
            }
        }
    }
}
