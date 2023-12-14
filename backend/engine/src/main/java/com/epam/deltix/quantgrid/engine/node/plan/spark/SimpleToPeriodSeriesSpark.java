package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.List;

@Slf4j
public class SimpleToPeriodSeriesSpark extends Plan2<Table, SparkValue, Table> {

    private final Period period;

    public SimpleToPeriodSeriesSpark(Plan layout, Plan source, Expression timestamp, Expression value, Period period) {
        super(sourceOf(layout), sourceOf(source, timestamp, value));
        this.period = period;
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.PERIOD_SERIES));
    }

    @Override
    protected Table execute(Table layout, SparkValue table) {
        Dataset<Row> dataset = table.getDataset();

        Column timestamp = expression(1, 0).toSpark();
        Column value = expression(1, 1).toSpark();

        Dataset<Row> select = dataset.select(timestamp, value);
        Column aggregation = aggregate(period);

        Dataset<Row> aggregated = select.agg(aggregation);

        List<Row> rows = aggregated.collectAsList();
        Util.verify(rows.size() == 1, "Simple ToPeriodSeries aggregation should return a single period series");
        Row row = rows.get(0);
        Row psRow = row.getStruct(0);
        return result(psRow);
    }

    static Column aggregate(Period period) {
        PeriodSeriesAggregator aggregator = new PeriodSeriesAggregator(period);
        return aggregator.toColumn().name("Period series");
    }

    private static LocalTable result(Row psRow) {
        double offset = psRow.getDouble(0);
        String period = psRow.getString(1);
        double[] values = psRow.getList(2).stream()
                .mapToDouble(Double.class::cast)
                .toArray();

        PeriodSeriesDirectColumn psColumn = new PeriodSeriesDirectColumn(
                new PeriodSeries(Period.valueOf(period), offset, values)
        );

        return new LocalTable(psColumn);
    }
}
