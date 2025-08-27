package com.epam.deltix.quantgrid.engine.meta;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.google.common.primitives.Ints;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Getter
@EqualsAndHashCode
@RequiredArgsConstructor
public class Schema {

    private static final int ORIGINAL = -1;

    private final ColumnType[] types;
    private final int[] inputs;
    private final int[] columns;

    public int size() {
        return types.length;
    }

    public ColumnType getType(int index) {
        return types[index];
    }

    public boolean hasInput(int index) {
        return inputs[index] >= 0;
    }

    /**
     * Returns the input node index from which this column comes from.
     */
    public int getInput(int index) {
        return inputs[index];
    }

    /**
     * Returns the input column index from which this column comes from.
     */
    public int getColumn(int index) {
        return columns[index];
    }

    public Schema asOriginal() {
        int inputSize = size();
        int[] originals = new int[inputSize];
        Arrays.fill(originals, ORIGINAL);
        return new Schema(types, originals, originals);
    }

    public Schema remove(int... positions) {
        List<ColumnType> newTypes = new ArrayList<>();
        IntList newInputs = new IntArrayList();
        IntList newColumns = new IntArrayList();

        for (int i = 0; i < types.length; i++) {
            boolean leave = (Ints.indexOf(positions, i) < 0);

            if (leave) {
                newTypes.add(types[i]);
                newInputs.add(inputs[i]);
                newColumns.add(columns[i]);
            }
        }

        return new Schema(newTypes.toArray(ColumnType[]::new), newInputs.toIntArray(), newColumns.toIntArray());
    }

    public static Schema ofN(ColumnType type, int count) {
        ColumnType[] types = new ColumnType[count];
        Arrays.fill(types, type);
        return Schema.of(types);
    }

    public static Schema of(List<ColumnType> types) {
        return of(types.toArray(ColumnType[]::new));
    }

    public static Schema of(ColumnType... types) {
        int[] indices = new int[types.length];
        Arrays.fill(indices, ORIGINAL);
        return new Schema(types, indices, indices);
    }

    public static Schema of(Schema... schemas) {
        int size = 0;

        for (Schema schema : schemas) {
            size += schema.size();
        }

        ColumnType[] types = new ColumnType[size];
        int[] inputs = new int[size];
        int[] columns = new int[size];
        int index = 0;

        for (Schema schema : schemas) {
            int length = schema.size();
            System.arraycopy(schema.types, 0, types, index, length);
            System.arraycopy(schema.inputs, 0, inputs, index, length);
            System.arraycopy(schema.columns, 0, columns, index, length);
            index += length;
        }

        return new Schema(types, inputs, columns);
    }

    public static Schema inputs(Plan node, int... inputs) {
        int size = 0;

        for (int input : inputs) {
            size += node.plan(input).getMeta().getSchema().size();
        }

        ColumnType[] types = new ColumnType[size];
        int[] indices = new int[size];
        int[] columns = new int[size];
        int index = 0;

        for (int input : inputs) {
            Schema schema = node.plan(input).getMeta().getSchema();

            for (int i = 0; i < schema.size(); i++) {
                types[index] = schema.getType(i);
                indices[index] = input;
                columns[index] = i;
                index++;
            }
        }

        return new Schema(types, indices, columns);
    }
}
