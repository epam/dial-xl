package com.epam.deltix.quantgrid.engine.python;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@UtilityClass
public class PythonExec {

    private static final String PYTHON = System.getenv().getOrDefault("QG_PYTHON_EXEC", "python3");
    private static final long TIMEOUT = Long.parseLong(System.getenv().getOrDefault("QG_PYTHON_TIMEOUT",
            System.getProperty("qg.python.timeout", "15000")));

    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

    public Table execute(String code, String function, ColumnType type, boolean nested, boolean scalar,
                         Table layout, List<SimpleColumn> simples, List<NestedColumn> nests,
                         int batch) {

        Callable<Table> task = () -> doExecute(code, function, type, nested, scalar, layout, simples, nests, batch);
        Future<Table> future = EXECUTOR.submit(task);

        try {
            return future.get(TIMEOUT, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            future.cancel(true);
            throw new RuntimeException("Failed to execute python function: " + function, e);
        }
    }

    @SneakyThrows
    private Table doExecute(String code, String function, ColumnType type, boolean nested, boolean scalar,
                            Table layout, List<SimpleColumn> simples, List<NestedColumn> nests, int batch) {
        String generated = generate(code, function, type, nested, simples, nests);
        Column[] columns = simples.stream().map(SimpleColumn::column).toArray(Column[]::new);
        NestedIterator[] iterators = nests.stream().map(NestedIterator::new).toArray(NestedIterator[]::new);

        Path temp = null;
        Process process = null;

        try {
            temp = Files.createTempFile("qgpy", "execute");
            Files.writeString(temp, generated, StandardCharsets.UTF_8);

            process = PythonExec.exec(temp);

            BufferedReader input = new BufferedReader(new InputStreamReader(process.getInputStream()));
            BufferedWriter output = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));
            int size = Util.toIntSize(layout.size());

            LongArrayList refs = (nested && !scalar) ? new LongArrayList(size) : null;
            ObjectArrayList<String> strings = type.isString() ? new ObjectArrayList<>(size) : null;
            DoubleArrayList doubles = type.isDouble() ? new DoubleArrayList(size) : null;

            output.write(Integer.toString(size));
            output.write('\n');
            output.flush();

            for (int from = 0; from < size; from += batch) {
                int to = Math.min(from + batch, size);
                write(columns, iterators, from, to, output);
                read(input, from, to, type, nested, refs, strings, doubles);
            }

            Column values = type.isString() ? new StringDirectColumn(strings) : new DoubleDirectColumn(doubles);
            Table result = new LocalTable(values);

            if (refs != null) {
                Table left = LocalTable.indirectOf(layout, refs);
                result = LocalTable.compositeOf(left, result);
            }

            return result;
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }

            if (temp != null) {
                Files.deleteIfExists(temp);
            }
        }
    }

    private void write(Column[] simples, NestedIterator[] nests, int from, int to, BufferedWriter output)
            throws Exception {

        for (; from < to; from++) {
            for (Column arg : simples) {
                if (arg instanceof DoubleColumn doubles) {
                    double value = doubles.get(from);
                    output.write(writeDouble(value));
                } else if (arg instanceof StringColumn strings) {
                    String value = strings.get(from);
                    output.write(writeString(value));
                } else {
                    throw new IllegalArgumentException("Unsupported type: " + arg.getClass());
                }

                output.write('\n');
            }

            for (NestedIterator iterator : nests) {
                iterator.move();
                output.write(Long.toString(iterator.size()));
                output.write('\n');

                if (iterator.isDouble()) {
                    while (iterator.hasNext()) {
                        double value = iterator.nextDouble();
                        output.write(writeDouble(value));
                        output.write('\n');
                    }
                } else {
                    while (iterator.hasNext()) {
                        String value = iterator.nextString();
                        output.write(writeString(value));
                        output.write('\n');
                    }
                }
            }
        }

        output.flush();
    }

    private void read(BufferedReader input, int from, int to, ColumnType type, boolean nested,
                      LongArrayList refs, ObjectArrayList<String> strings, DoubleArrayList doubles)
            throws IOException {

        if (type.isString() && nested) {
            for (; from < to; from++) {
                int size = Integer.parseUnsignedInt(input.readLine());

                for (int i = 0; i < size; i++) {
                    String value = input.readLine();
                    strings.add(readString(value));

                    if (refs != null) {
                        refs.add(from);
                    }
                }
            }
        } else if (type.isString()) {
            for (; from < to; from++) {
                String value = input.readLine();
                strings.add(readString(value));
            }
        } else if (nested) {
            for (; from < to; from++) {
                int size = Integer.parseUnsignedInt(input.readLine());

                for (int i = 0; i < size; i++) {
                    String value = input.readLine();
                    doubles.add(readDouble(value));

                    if (refs != null) {
                        refs.add(from);
                    }
                }
            }
        } else {
            for (; from < to; from++) {
                String value = input.readLine();
                doubles.add(readDouble(value));
            }
        }
    }

    private static String writeString(String value) {
        return (value == null) ? "" : value.replace("\\", "\\\\")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private static String readString(String line) {
        return line.replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\\\", "\\");
    }

    private String writeDouble(double value) {
        if (Double.isNaN(value)) {
            return "nan";
        }

        if (value == Double.POSITIVE_INFINITY) {
            return "inf";
        }

        if (value == Double.NEGATIVE_INFINITY) {
            return "-inf";
        }

        return Double.toString(value);
    }

    private double readDouble(String result) {
        return switch (result) {
            case "nan", "None" -> Doubles.ERROR_NA;
            case "-inf" -> Double.NEGATIVE_INFINITY;
            case "inf" -> Double.POSITIVE_INFINITY;
            default -> Double.parseDouble(result);
        };
    }

    private String generate(String code, String function, ColumnType type, boolean nested,
                            List<SimpleColumn> simples, List<NestedColumn> nests) {
        StringBuilder builder = new StringBuilder();
        builder.append(code);
        builder.append("\n");
        builder.append("""
                def writeDouble93715264928(value):
                  print(value)
                                
                def writeString93715264928(value):
                  if value == None:
                    value = ''
                  else:
                    value = str(value).replace('\\\\', '\\\\\\\\').replace('\\n', '\\\\n').replace('\\r', '\\\\r')
                  print(value)
                                
                def writeDoubles93715264928(list):
                  print(len(list))
                  for value in list:
                    writeDouble93715264928(value)
                                
                def writeStrings93715264928(list):
                  print(len(list))
                  for value in list:
                    writeString93715264928(value)
                                
                def readString93715264928():
                  line = input()
                  return line.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\\\\\', '\\\\')
                                
                def readDouble93715264928():
                  return float(input())
                                
                def readInt93715264928():
                  return int(input())
                                
                def readDoubles93715264928():
                  result = []
                  for i in range(0, readInt93715264928()):
                    result.append(readDouble93715264928())
                  return result
                                
                def readStrings93715264928():
                  result = []
                  for i in range(0, readInt93715264928()):
                    result.append(readString93715264928())
                  return result
                                
                for i in range(0, readInt93715264928()):
                """);

        for (SimpleColumn column : simples) {
            builder.append("  arg").append(column.position).append(" = ");
            builder.append(column.type.isString() ? "readString93715264928()" : "readDouble93715264928()");
            builder.append("\n");
        }

        for (NestedColumn column : nests) {
            builder.append("  arg").append(column.position).append(" = ");
            builder.append(column.type.isString() ? "readStrings93715264928()" : "readDoubles93715264928()");
            builder.append("\n");
        }

        builder.append("  res = ").append(function).append("(");

        for (int i = 0, args = simples.size() + nests.size(); i < args; i++) {
            builder.append(i == 0 ? "" : ", ");
            builder.append("arg").append(i);
        }

        builder.append(")\n");

        if (nested) {
            builder.append("  ")
                    .append(type.isString() ? "writeStrings93715264928(res)" : "writeDoubles93715264928(res)");
        } else {
            builder.append("  ")
                    .append(type.isString() ? "writeString93715264928(res)" : "writeDouble93715264928(res)");
        }

        builder.append("\n");
        return builder.toString();
    }

    private static class NestedIterator {

        private final DoubleColumn keys;
        private final DoubleColumn doubles;
        private final StringColumn strings;
        private final long capacity;

        public NestedIterator(NestedColumn column) {
            Column values = column.column;
            this.keys = column.key;
            this.doubles = column.type.isDouble() ? (DoubleColumn) values : null;
            this.strings = column.type.isString() ? (StringColumn) values : null;
            this.capacity = values.size();
        }

        long start;
        long end;
        long number = -1;
        long size;

        long size() {
            return size;
        }

        boolean isDouble() {
            return doubles != null;
        }

        void move() {
            number++;
            size = 0;
            start = end;

            if (end >= capacity) {
                return;
            }

            if (keys == null) {
                end = capacity;
                size = capacity;
                return;
            }

            for (; end < capacity && number == keys.get(end); end++, size++) {
            }
        }

        boolean hasNext() {
            return start < end;
        }

        double nextDouble() {
            return doubles.get(start++);
        }

        String nextString() {
            return strings.get(start++);
        }
    }

    private Process exec(Path file) throws Exception {
        ArrayList<String> commands = new ArrayList<>();
        commands.add(PYTHON);
        commands.add(file.toString());
        return new ProcessBuilder().command(commands).start();
    }

    public record SimpleColumn(Column column, ColumnType type, int position) {
    }

    public record NestedColumn(DoubleColumn key, Column column, ColumnType type, int position) {
    }
}