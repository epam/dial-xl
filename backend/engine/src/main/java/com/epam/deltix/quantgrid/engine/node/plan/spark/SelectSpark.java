package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.value.spark.SparkColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;

import java.util.ArrayList;
import java.util.List;
import java.util.function.UnaryOperator;

public class SelectSpark extends Plan0<SparkTable> {

    public SelectSpark(Expression... inputs) {
        super(List.of(inputs));
    }

    @Override
    protected Plan layout() {
        return getExpression(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType[] types = expressions(0).stream().map(Expression::getType).toArray(ColumnType[]::new);
        return new Meta(Schema.of(types));
    }

    @Override
    public SparkTable execute() {
        List<Expression> expressions = expressions(0);
        List<TablePartition[]> columns = new ArrayList<>(expressions.size());

        for (Expression expression : expressions) {
            SparkColumn column = expression.evaluate();
            columns.add(column.getPartitions());
        }

        UnaryOperator<String> nameGenerator = new UniqueNameGenerator(columns.size());
        TablePartition[] tablePartitions = PartitionUtil.selectColumns(columns, nameGenerator);

        return new SparkTable(tablePartitions);
    }

    public static class UniqueNameGenerator implements UnaryOperator<String> {
        private final Object2IntOpenHashMap<String> nameToCount;

        public UniqueNameGenerator(int expectedCount) {
            this.nameToCount = new Object2IntOpenHashMap<>(expectedCount);
            this.nameToCount.defaultReturnValue(0);
        }

        @Override
        public String apply(String name) {
            int index = nameToCount.addTo(name, 1);

            if (index == 0) {
                return name;
            }

            // append suffix until it's unique
            String newName = name;
            do {
                newName = newName + "_" + index;
            } while (nameToCount.putIfAbsent(newName, 1) != 0);

            return newName;
        }
    }
}
