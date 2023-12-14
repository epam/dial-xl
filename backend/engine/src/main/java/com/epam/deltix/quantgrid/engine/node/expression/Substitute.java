package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class Substitute extends Expression3<StringColumn, StringColumn, StringColumn, StringColumn> {

    public Substitute(Expression source, Expression oldText, Expression newText) {
        super(source, oldText, newText);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected StringColumn evaluate(StringColumn values, StringColumn oldValues, StringColumn newValues) {
        return new StringLambdaColumn(i -> {
            String value = values.get(i);
            String oldText = oldValues.get(i);
            String newText = newValues.get(i);

            if (Util.isNa(value) || Util.isNa(oldText) || Util.isNa(newText)) {
                return null;
            }

            return value.replace(oldText, newText);
        }, values.size());
    }
}
