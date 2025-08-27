package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.Span;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

@UtilityClass
public class CompileSimilaritySearch {
    public Plan compileIndex(
            CompileContext context,
            FieldKey field,
            @Nullable ParsedDecorator descriptionDecorator) {
        FieldReference targetField = new FieldReference(new TableReference(field.tableName()), field.fieldName());
        if (descriptionDecorator == null) {
            CompiledNestedColumn uniqueResult = context.compileFormula(
                            new com.epam.deltix.quantgrid.parser.ast.Function("UNIQUE", targetField))
                    .cast(CompiledNestedColumn.class);

            return CompileEmbeddingIndex.compileEmbeddingIndex(
                    context,
                    uniqueResult.node(),
                    uniqueResult.flat(),
                    null,
                    CompileEvaluationUtils.SIMILARITY_SEARCH_MODEL,
                    EmbeddingType.DOCUMENT);
        }

        FieldReference descriptionField = new FieldReference(
                new TableReference(field.tableName()), (String) descriptionDecorator.params().get(0).value());

        com.epam.deltix.quantgrid.parser.ast.Function concatFunction =
                new com.epam.deltix.quantgrid.parser.ast.Function(
                        "CONCATENATE",
                        targetField,
                        new ConstText(" "),
                        descriptionField
                );

        CompiledTable uniqueByResult = context.compileFormula(
                new com.epam.deltix.quantgrid.parser.ast.Function(
                        "UNIQUEBY",
                        new TableReference(field.table()),
                        new com.epam.deltix.quantgrid.parser.ast.Function(
                                "IF",
                                new com.epam.deltix.quantgrid.parser.ast.Function("ISNA", descriptionField),
                                targetField,
                                concatFunction
                        )
                )
        ).cast(CompiledReferenceTable.class).flat().cast(CompiledTable.class);

        CompiledResult targetColumn = uniqueByResult.field(context, field.fieldName())
                .cast(CompiledSimpleColumn.class);
        CompiledResult descriptionColumn = uniqueByResult.field(context, descriptionField.field())
                .cast(CompiledSimpleColumn.class);

        return CompileEmbeddingIndex.compileEmbeddingIndex(
                context,
                uniqueByResult.node(),
                targetColumn,
                descriptionColumn,
                CompileEvaluationUtils.SIMILARITY_SEARCH_MODEL,
                EmbeddingType.DOCUMENT);
    }

    public Plan compileSimilaritySearch(Compiler compiler, FieldKey field, String query, Span span) {
        CompileKey key = new CompileKey(field, true, true);

        CompileContext context = new CompileContext(compiler, key);

        FieldReference targetField = new FieldReference(
                new TableReference(field.tableName()), field.fieldName());

        com.epam.deltix.quantgrid.parser.ast.Function evaluateModel = new com.epam.deltix.quantgrid.parser.ast.Function(
                "EVALUATE_MODEL",
                new FieldReference(new TableReference(field.tableName()), field.fieldName())
        );
        com.epam.deltix.quantgrid.parser.ast.Function evaluateN = new com.epam.deltix.quantgrid.parser.ast.Function(
                "EVALUATE_N",
                new FieldReference(new TableReference(field.tableName()), field.fieldName())
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

        RetrieverResultLocal plan = new RetrieverResultLocal(
                new SelectLocal(retriever, retrieverScores, retrieverDescriptions),
                key.fieldKey(), context.computationId());

        Trace trace = new Trace(context.computationId(), Trace.Type.INDEX, field, span);
        plan.getTraces().add(trace);

        return plan;
    }
}
