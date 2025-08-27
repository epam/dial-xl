package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.Span;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class CompileEvaluationUtils {
    public final String INDEX_DECORATOR = "index";
    public final String DESCRIPTION_DECORATOR = "description";
    public final String EVALUATION_FIELD_DECORATOR = "evaluation_field";
    public final String SIMILARITY_SEARCH_MODEL = "bge-small-en-v1.5";

    private final String EVALUATION_TABLE_DECORATOR = "evaluation";
    private final String EVALUATION_QUESTION_DECORATOR = "evaluation_question";

    public record EvaluationField(FieldKey field, FieldKey groundTruth, Span span) {}

    public boolean isEvaluationTable(ParsedTable table) {
        return table.decorators().stream().map(ParsedDecorator::decoratorName)
                .anyMatch(EVALUATION_TABLE_DECORATOR::equals);
    }

    public boolean isEvaluationQuestion(ParsedField field) {
        return field.decorators().stream().map(ParsedDecorator::decoratorName)
                .anyMatch(EVALUATION_QUESTION_DECORATOR::equals);
    }

    public boolean isEvaluationField(ParsedField field) {
        return field.decorators().stream().map(ParsedDecorator::decoratorName)
                .anyMatch(EVALUATION_FIELD_DECORATOR::equals);
    }

    public String getEvaluationQuestionField(ParsedTable table) {
        for (ParsedFields fields: table.fields()) {
            for (ParsedField field : fields.fields()) {
                if (isEvaluationQuestion(field)) {
                    return field.fieldName();
                }
            }
        }

        return null;
    }

    public FieldKey getDescriptionField(CompileContext context, FieldKey key) {
        ParsedFields fields = context.compiler.parsedObject(CompileKey.fieldKey(key, true, true));
        for (ParsedField field : fields.fields()) {
            if (field.fieldName().equals(key.fieldName())) {
                for (ParsedDecorator decorator : field.decorators()) {
                    if (decorator.decoratorName().equals(DESCRIPTION_DECORATOR)) {
                        return new FieldKey(key.tableName(), decorator.params().get(0).value().toString());
                    }
                }
            }
        }

        return null;
    }

    public List<EvaluationField> getEvaluationFields(ParsedTable table) {
        List<EvaluationField> fields = new ArrayList<>();
        List<ParsedField> allFields = table.fields().stream()
                .flatMap(declaration -> declaration.fields().stream())
                .toList();

        for (ParsedField parsedField : allFields) {
            if (!CompileEvaluationUtils.isEvaluationField(parsedField)) {
                continue;
            }

            for (int j = 0; j < parsedField.decorators().size(); ++j) {
                ParsedDecorator decorator = parsedField.decorators().get(j);

                if (decorator.decoratorName().equals(EVALUATION_FIELD_DECORATOR)) {
                    String tableName = decorator.params().get(0).value().toString();
                    String fieldName = decorator.params().get(1).value().toString();

                    fields.add(new EvaluationField(
                            new FieldKey(tableName, fieldName),
                            new FieldKey(table.tableName(), parsedField.fieldName()),
                            decorator.span()
                        )
                    );
                }
            }
        }

        return fields;
    }
}
