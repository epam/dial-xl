package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Strings;

import java.util.List;

public class Concatenate extends ExpressionN<StringColumn, StringColumn> {

    public Concatenate(List<Expression> sources) {
        super(sources);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected StringColumn evaluate(List<StringColumn> args) {
        return new StringLambdaColumn(i -> {
            StringBuilder result = new StringBuilder();

            for (StringColumn arg : args) {
                String value = arg.get(i);

                if (Strings.isError(value)) {
                    return value;
                }

                result.append(value);
            }

            return result.toString();
        }, args.get(0).size());
    }
}
