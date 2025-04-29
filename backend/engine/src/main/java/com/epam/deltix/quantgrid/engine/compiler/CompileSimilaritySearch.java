package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import lombok.experimental.UtilityClass;

@UtilityClass
public class CompileSimilaritySearch {
    public Plan compileSimilaritySearch(Compiler compiler,
                                        SimilarityRequestField field,
                                        String modelName,
                                        Plan query) {
        CompileKey key = new CompileKey(field.key(), true, true);

        CompileContext context = new CompileContext(compiler, key);

        FieldReference targetField = new FieldReference(
                new TableReference(field.key().tableName()), field.key().fieldName());

        Plan data;
        if (field.descriptionKey() != null) {
            FieldReference descriptionField = new FieldReference(new TableReference(field.descriptionKey().tableName()), field.descriptionKey().fieldName());

            com.epam.deltix.quantgrid.parser.ast.Function concatFunction = new com.epam.deltix.quantgrid.parser.ast.Function(
                    "CONCATENATE",
                    targetField,
                    new ConstText(" "),
                    descriptionField
            );

            CompiledTable uniqueByResult = context.compileFormula(
                    new com.epam.deltix.quantgrid.parser.ast.Function(
                            "UNIQUEBY",
                            new TableReference(field.key().tableName()),
                            new com.epam.deltix.quantgrid.parser.ast.Function(
                                    "IF",
                                    new com.epam.deltix.quantgrid.parser.ast.Function("ISNA", descriptionField),
                                    targetField,
                                    concatFunction
                            )
                    )
            ).cast(CompiledReferenceTable.class).flat().cast(CompiledTable.class);

            CompiledResult
                    targetColumn = uniqueByResult.field(context, field.key().fieldName()).cast(CompiledSimpleColumn.class);
            CompiledResult descriptionColumn = uniqueByResult.field(context, field.descriptionKey().fieldName()).cast(CompiledSimpleColumn.class);

            data = CompileEmbeddingIndex.compileEmbeddingIndex(
                    context,
                    uniqueByResult.node(),
                    targetColumn,
                    descriptionColumn,
                    modelName,
                    EmbeddingType.DOCUMENT);
        } else {
            CompiledNestedColumn uniqueResult = context.compileFormula(
                    new com.epam.deltix.quantgrid.parser.ast.Function(
                            "UNIQUE",
                            targetField
                    )
            ).cast(CompiledNestedColumn.class);

            data = CompileEmbeddingIndex.compileEmbeddingIndex(
                    context,
                    uniqueResult.node(),
                    uniqueResult.flat(),
                    null,
                    modelName,
                    EmbeddingType.DOCUMENT);
        }

        return new SimilaritySearchLocal(key.fieldKey(), field.descriptionKey(), field.n(), data, query);
    }

    public Plan compileSimilaritySearch(Compiler compiler,
                                        SimilarityRequestField field,
                                        String query,
                                        ParsedTable evaluationTable) {
        CompileKey key = new CompileKey(field.key(), true, true);

        CompileContext context = new CompileContext(compiler, key);

        FieldReference targetField = new FieldReference(
                new TableReference(field.key().tableName()), field.key().fieldName());

        com.epam.deltix.quantgrid.parser.ast.Function evaluateModel = new com.epam.deltix.quantgrid.parser.ast.Function(
                "EVALUATE_MODEL",
                new FieldReference(new TableReference(field.key().tableName()), field.key().fieldName())
        );
        com.epam.deltix.quantgrid.parser.ast.Function evaluateN = new com.epam.deltix.quantgrid.parser.ast.Function(
                "EVALUATE_N",
                new FieldReference(new TableReference(field.key().tableName()), field.key().fieldName())
        );

        Expression retriever = context.compileFormula(
                new com.epam.deltix.quantgrid.parser.ast.Function(
                        "RETRIEVE",
                        targetField,
                        new ConstText(query),
                        evaluateN,
                        evaluateModel
                )
        ).cast(CompiledNestedColumn.class).expression();
        Expression retrieverScores = context.compileFormula(
                new com.epam.deltix.quantgrid.parser.ast.Function(
                        "RETRIEVE_SCORES",
                        targetField,
                        new ConstText(query),
                        evaluateN,
                        evaluateModel
                )
        ).cast(CompiledNestedColumn.class).expression();
        Expression retrieverDescriptions = context.compileFormula(
                new com.epam.deltix.quantgrid.parser.ast.Function(
                        "RETRIEVE_DESCRIPTIONS",
                        targetField,
                        new ConstText(query),
                        evaluateN,
                        evaluateModel
                )
        ).cast(CompiledNestedColumn.class).expression();

        return new RetrieverResultLocal(key.fieldKey(), new SelectLocal(retriever, retrieverScores, retrieverDescriptions));
    }
}
