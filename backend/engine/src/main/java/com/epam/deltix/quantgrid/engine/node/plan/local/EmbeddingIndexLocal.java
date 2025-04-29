package com.epam.deltix.quantgrid.engine.node.plan.local;

import ai.djl.inference.Predictor;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.translate.TranslateException;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModels;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class EmbeddingIndexLocal extends Plan2<Table, Table, Table> {
    public static final int NUMBER_OF_DIMENSIONS = 384;

    private final EmbeddingType embeddingType;

    public EmbeddingIndexLocal(Plan data, Plan model, EmbeddingType embeddingType, Expression dataColumn, Expression modelColumn) {
        super(sourceOf(data, List.of(dataColumn)), sourceOf(model, modelColumn));
        this.embeddingType = embeddingType;
    }

    public EmbeddingIndexLocal(Plan data, Plan model, EmbeddingType embeddingType, Expression dataColumn,
                               Expression descriptionColumn, Expression modelColumn) {
        super(sourceOf(data, List.of(dataColumn, descriptionColumn)), sourceOf(model, modelColumn));
        this.embeddingType = embeddingType;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    private boolean hasDescription() {
        return expressionCount(0) == 2;
    }

    @Override
    protected Meta meta() {
        if (hasDescription()) {
            return new Meta(Schema.of(ColumnType.STRING, ColumnType.DOUBLE, ColumnType.STRING));
        } else {
            return new Meta(Schema.of(ColumnType.STRING, ColumnType.DOUBLE));
        }
    }

    @Override
    public Table execute(Table dataTable, Table modelTable) {
        List<Expression> expressions = expressions(0);

        Column[] columns = new Column[expressions.size() + 1];
        for (int i = 0; i < expressions.size(); ++i) {
            columns[i] = expressions.get(i).evaluate();
        }
        columns[columns.length - 1] = expressions(1).get(0).evaluate();

        Column[] result = embeddingIndex(columns);
        return new LocalTable(result);
    }

    private Column[] embeddingIndex(Column[] columns) {
        for (Column column : columns) {
            if (!(column instanceof StringColumn)) {
                throw new IllegalArgumentException("Unsupported colum type: " + column.getClass());
            }
        }

        StringColumn modelColumn = (StringColumn) columns[columns.length - 1];
        if (modelColumn.size() == 0) {
            if (hasDescription()) {
                return List.of(new StringDirectColumn(), new DoubleDirectColumn(), new StringDirectColumn()).toArray(new Column[3]);
            } else {
                return List.of(new StringDirectColumn(), new DoubleDirectColumn()).toArray(new Column[2]);
            }
        }
        final ZooModel<String, float[]> model = getModel(modelColumn);
        String modelName = model.getName();
        final Predictor<String, float[]> predictor = model.newPredictor();

        String prefix = EmbeddingModels.getPrefix(modelName, this.embeddingType);

        StringColumn targetColumn = (StringColumn) columns[0];
        StringColumn descriptionColumn = hasDescription() ? (StringColumn) columns[1] : null;

        List<String> embeddingBatch = new ArrayList<>((int) targetColumn.size());
        for (int i = 0; i < targetColumn.size(); ++i) {
            String data = targetColumn.get(i) + (descriptionColumn == null ? "" : " " + descriptionColumn.get(i));

            embeddingBatch.add(prefix + data);
        }

        List<float[]> vectors = new ArrayList<>(embeddingBatch.size());
        try {
            for (int i = 0; i < embeddingBatch.size(); ++i) {
                vectors.add(predictor.predict(embeddingBatch.get(i)));
            }
        } catch (TranslateException e) {
            throw new IllegalArgumentException("Unsupported data to calculate embedding");
        }

        double[] vectorData = new double[NUMBER_OF_DIMENSIONS * (int) targetColumn.size()];
        for (int i = 0; i < targetColumn.size(); ++i) {
            for (int j = 0; j < vectors.get(i).length; ++j) {
                vectorData[i * NUMBER_OF_DIMENSIONS + j] = vectors.get(i)[j];
            }
        }

        Column[] result = new Column[descriptionColumn != null ? 3 : 2];
        result[0] = new StringLambdaColumn(
                (index) -> targetColumn.get((int) index / NUMBER_OF_DIMENSIONS),
                vectorData.length
        );

        if (descriptionColumn != null) {
            result[2] = new StringLambdaColumn(
                    (index) -> descriptionColumn.get((int) index / NUMBER_OF_DIMENSIONS),
                    vectorData.length
            );
        }
        result[1] = new DoubleDirectColumn(vectorData);

        return result;
    }

    private static ZooModel<String, float[]> getModel(StringColumn column) {
        for (int j = 0; j < column.size(); ++j) {
            if (Strings.isError(column.get(j))) {
                throw new IllegalArgumentException("The model should be specified");
            }

            if (j > 0 && !column.get(0).equals(column.get(j))) {
                throw new IllegalArgumentException("The model must be consistent");
            }
        }

        String modelName = column.get(0);
        ZooModel<String, float[]> model = EmbeddingModels.getModel(modelName);

        if (model == null) {
            throw new IllegalArgumentException("%s is unsupported model".formatted(modelName));
        }

        return model;
    }
}
