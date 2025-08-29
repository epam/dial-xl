package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModel;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.vector.SimpleVectorSearch;
import com.epam.deltix.quantgrid.engine.vector.model.DataScore;
import com.epam.deltix.quantgrid.engine.vector.model.VectorData;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.List;

@Getter
public class SimilaritySearchLocal extends Plan2<Table, Table, Table> implements ResultPlan {
    private final FieldKey key;
    private final int n;
    private final long computationId;

    public SimilaritySearchLocal(Plan a, Plan b,
                                 FieldKey key,
                                 int n, long computationId) {
        super(a, b);
        this.key = key;
        this.n = n;
        this.computationId = computationId;
    }

    @Override
    public ComputationType getComputationType() {
        return ComputationType.REQUIRED;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING, ColumnType.DOUBLE, ColumnType.STRING));
    }

    @Override
    protected Table execute(Table documentsTable, Table queryTable) {
        int embeddingDimensions = EmbeddingModel.NUMBER_OF_DIMENSIONS;

        VectorData[] documents = new VectorData[(int) documentsTable.size() / embeddingDimensions];
        StringColumn documentsData = documentsTable.getStringColumn(0);
        StringColumn descriptionData = documentsTable.getColumnCount() >= 3 ? documentsTable.getStringColumn(2) : null;
        for (int i = 0; i < documents.length; ++i) {
            double[] vector = new double[embeddingDimensions];
            for (int j = 0; j < embeddingDimensions; ++j) {
                vector[j] = documentsTable.getDoubleColumn(1).get((long) i * embeddingDimensions + j);
            }

            documents[i] = new VectorData(
                    new DoubleDirectColumn(vector),
                    documentsData.get(i * embeddingDimensions),
                    descriptionData != null ? descriptionData.get(i * embeddingDimensions) : null
            );
        }

        double[] queryVector = new double[embeddingDimensions];
        for (int i = 0; i < embeddingDimensions; ++i) {
            queryVector[i] = queryTable.getDoubleColumn(1).get(i);
        }

        List<DataScore> closestData = SimpleVectorSearch.findNClosestVectors(documents, new DoubleDirectColumn(queryVector), n);

        String[] data = new String[closestData.size()];
        String[] descriptions = new String[closestData.size()];
        double[] scores = new double[closestData.size()];
        for (int i = 0; i < closestData.size(); ++i) {
            data[i] = closestData.get(i).data();
            scores[i] = closestData.get(i).score();
            descriptions[i] = closestData.get(i).description();
        }

        Column[] result = new Column[3];
        result[0] = new StringDirectColumn(data);
        result[1] = new DoubleDirectColumn(scores);
        result[2] = new StringDirectColumn(descriptions);

        return new LocalTable(result);
    }

    @Override
    public String toString() {
        return "SimilaritySearch(%s[%s], %s)(#%s)".formatted(key.tableName(), key.fieldName(), n, computationId);
    }
}
