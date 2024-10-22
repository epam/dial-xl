package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.*;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.EmbeddingIndexLocal;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

@UtilityClass
public class CompileEmbeddingIndex {

    public EmbeddingIndexLocal compileEmbeddingIndex(CompileContext context,
                                                     Plan exploded,
                                                     CompiledResult targetField,
                                                     @Nullable CompiledResult descriptionField,
                                                     String modelName,
                                                     EmbeddingType embeddingType) {
        if (!(targetField instanceof CompiledColumn targetColumn && targetColumn.type() == ColumnType.STRING)) {
            throw new CompileError(
                    "Unsupported compiled result " + targetField.getClass().getSimpleName());
        }

        if (descriptionField != null && !(descriptionField instanceof CompiledColumn descriptionColumn && descriptionColumn.type() == ColumnType.STRING)) {
            throw new CompileError(
                    "Unsupported compiled result " + descriptionField.getClass().getSimpleName());
        }

        Expression model = context.compileFormula(new ConstText(modelName)).cast(CompiledSimpleColumn.class).node();
        if (descriptionField == null) {
            return new EmbeddingIndexLocal(
                    exploded,
                    context.scalarLayout().node(),
                    embeddingType,
                    (Expression) targetColumn.node(),
                    model
            );
        } else {
            return new EmbeddingIndexLocal(
                    exploded,
                    context.scalarLayout().node(),
                    embeddingType,
                    (Expression) targetColumn.node(),
                    (Expression) descriptionField.node(),
                    model
            );
        }
    }

    public EmbeddingIndexLocal compileEmbeddingIndex(Plan exploded,
                                                     CompiledResult targetField,
                                                     @Nullable CompiledResult descriptionField,
                                                     Plan modelTable,
                                                     CompiledResult modelField,
                                                     EmbeddingType embeddingType) {
        if (!(targetField instanceof CompiledColumn targetColumn && targetColumn.type() == ColumnType.STRING)) {
            throw new CompileError(
                    "Unsupported compiled result " + targetField.getClass().getSimpleName());
        }

        if (!(modelField instanceof CompiledColumn modelColumn && modelColumn.type() == ColumnType.STRING)) {
            throw new CompileError(
                    "Unsupported compiled result " + targetField.getClass().getSimpleName());
        }

        if (descriptionField != null && !(descriptionField instanceof CompiledColumn descriptionColumn && descriptionColumn.type() == ColumnType.STRING)) {
            throw new CompileError(
                    "Unsupported compiled result " + descriptionField.getClass().getSimpleName());
        }

        if (descriptionField == null) {
            return new EmbeddingIndexLocal(
                    exploded,
                    modelTable,
                    embeddingType,
                    (Expression) targetColumn.node(),
                    (Expression) modelField.node()
            );
        } else {
            return new EmbeddingIndexLocal(
                    exploded,
                    modelTable,
                    embeddingType,
                    (Expression) targetColumn.node(),
                    (Expression) descriptionField.node(),
                    (Expression) modelField.node()
            );
        }
    }
}
