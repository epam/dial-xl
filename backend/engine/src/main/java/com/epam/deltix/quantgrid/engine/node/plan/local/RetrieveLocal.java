package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan3;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.vector.SimpleVectorSearch;
import com.epam.deltix.quantgrid.engine.vector.model.DataScore;
import com.epam.deltix.quantgrid.engine.vector.model.VectorData;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Getter
@Slf4j
public class RetrieveLocal extends Plan3<Table, Table, Table, Table> {
    private final int embeddingDimensions;

    public RetrieveLocal(Plan documentsTable, Plan queryTable, int embeddingDimensions, Plan source, Expression questionField, Expression nField) {
        super(sourceOf(documentsTable), sourceOf(queryTable), sourceOf(source, List.of(questionField, nField)));

        this.embeddingDimensions = embeddingDimensions;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        Schema left = Schema.inputs(this, 2);
        Schema right = Schema.of(ColumnType.STRING, ColumnType.DOUBLE, ColumnType.STRING);

        return new Meta(Schema.of(left, right));
    }

    @Override
    public Table execute(Table documentsTable, Table queryTable, Table sourceTable) {
        LongArrayList refs = new LongArrayList();
        ObjectArrayList<String> data = new ObjectArrayList<>();
        DoubleArrayList scores = new DoubleArrayList();
        ObjectArrayList<String> descriptions = new ObjectArrayList<>();

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
                    documentsData.get((long) i * embeddingDimensions),
                    descriptionData != null ? descriptionData.get((long) i * embeddingDimensions) : null
            );
        }

        DoubleColumn n = source(2).expressions().get(1).evaluate();
        for (int rowId = 0; rowId < queryTable.size() / embeddingDimensions; ++rowId) {
            double[] queryVector = new double[embeddingDimensions];
            for (int i = 0; i < embeddingDimensions; ++i) {
                queryVector[i] = queryTable.getDoubleColumn(1).get(i + (long) rowId * embeddingDimensions);
            }

            int nValue = (int) n.get(rowId);
            List<DataScore> closestData =
                    nValue == Integer.MAX_VALUE ?
                            SimpleVectorSearch.calculateDocumentScores(documents, new DoubleDirectColumn(queryVector)) :
                            SimpleVectorSearch.findNClosestVectors(documents, new DoubleDirectColumn(queryVector), nValue);
            closestData.sort((o1, o2) -> Double.compare(o2.score(), o1.score()));

            for (DataScore closestDatum : closestData) {
                refs.add(rowId);
                data.add(closestDatum.data());
                scores.add(closestDatum.score());
                descriptions.add(closestDatum.description());
            }
        }

        Column[] result = new Column[3];
        result[0] = new StringDirectColumn(data);
        result[1] = new DoubleDirectColumn(scores);
        result[2] = new StringDirectColumn(descriptions);

        Table lefts = LocalTable.indirectOf(sourceTable, refs);
        LocalTable right = new LocalTable(result);

        return LocalTable.compositeOf(lefts, right);
    }

    @Override
    public String toString() {
        return "Retrieve()";
    }
}
