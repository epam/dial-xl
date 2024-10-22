package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import lombok.Getter;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import static com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable.REF_NA;

@Getter
@Accessors(fluent = true)
public class CompileContext {

    protected final Compiler compiler;
    protected final CompileKey key;

    /**
     * Context table is set when compiling nested formulas.
     */
    protected final CompiledTable compiledTable;
    protected final CompiledTable promotedTable;

    /**
     * Defines how to reference fields from context table. Only used when context table is set.

     */
    protected final boolean nested;

    /**
     * Used to override dimensions based layout we build in {@link #aggregationLayout} which is needed to alternate
     * behaviour for complex cases like {@link CompilePivot}
     */
    @Nullable
    protected final CompiledTable layout;

    @Nullable
    protected final Function function;

    public CompileContext(Compiler compiler, CompileKey key) {
        this(compiler, key, null, null, false, null, null);
    }

    public CompileContext(Compiler compiler, CompileKey key, CompiledTable promotedTable, CompiledTable compiledTable, boolean nested,
                          @Nullable CompiledTable layout, @Nullable Function function) {
        this.compiler = compiler;
        this.key = key;
        this.compiledTable = compiledTable;
        this.promotedTable = promotedTable;
        this.nested = nested;
        this.layout = layout;
        this.function = function;
    }

    public CompiledTable layout() {
        CompileKey tableKey = CompileKey.tableKey(key.table());
        return compiler.compile(tableKey).cast(CompiledTable.class);
    }

    public CompiledTable layout(List<FieldKey> dimensions) {
        return layout(key.table(), dimensions);
    }

    public CompiledTable layout(String table, List<FieldKey> dimensions) {
        return compiler.layoutTable(table, dimensions);
    }

    public CompiledTable aggregationLayout(CompiledTable source) {
        if (layout == null || promotedTable == null || !CompileUtil.isContextNode(layout, promotedTable, source)) {
            return layout(source.dimensions());
        }
        return layout;
    }

    public CompiledTable scalarLayout() {
        return compiler.scalar();
    }

    /**
     * <pre>
     * table B
     *   dim [a] = RANGE(5)
     *       [b] = [a] + 10              # null
     *       [c] = A.FILTER($[a] > 1)    # A when compiling condition
     *       [d] = A.FILTER($[a] > [a])  # B, A when compiling condition
     * </pre>
     *
     * @return context table when compiling a formula inside a formula.
     */
    @Nullable
    public CompiledTable promotedTable() {
        return promotedTable;
    }

    public CompiledTable table(String name) {
        CompileKey key = CompileKey.tableKey(name);
        return compiler.compile(key).cast(CompiledTable.class);
    }

    public CompiledTable currentTable(List<FieldKey> dimensions) {
        CompiledTable layout = layout(dimensions);

        if (layout.scalar()) {
            CompileUtil.verify(dimensions.isEmpty());
            return new CompiledReferenceTable(key.table(), layout.node(), dimensions, REF_NA, REF_NA, false);
        }

        SelectLocal plan = new SelectLocal(new RowNumber(layout.node()));
        return new CompiledReferenceTable(key.table(), plan, dimensions, 0, REF_NA, false);
    }

    public CompiledResult currentField(String field) {
        if (key.isTotal()) {
            throw new CompileError("Not allowed to reference current fields in total formula. Try: "
                    + key.table() + "[" + field + "]?");
        }

        if (key.isOverride()) {
            CompiledTable table = overrideRowTable();
            return table.field(this, field);
        }

        return field(key.table(), field, false);
    }

    public CompiledResult field(String table, String field, boolean exploded) {
        CompileKey key = CompileKey.fieldKey(table, field, exploded, true);
        return compiler.compile(key);
    }

    public CompiledResult field(String table, String field, boolean exploded, boolean overridden) {
        CompileKey key = CompileKey.fieldKey(table, field, exploded, overridden);
        return compiler.compile(key);
    }

    public CompiledSimpleColumn total(String table, String field, int number) {
        CompileKey key = CompileKey.totalKey(table, field, number);
        return (CompiledSimpleColumn) compiler.compile(key);
    }

    public CompileContext withCompiledAndPromoted(CompiledTable promotedTable, CompiledTable compiledTable, boolean nested) {
        return new CompileContext(compiler, key, promotedTable, compiledTable, nested, null, function);
    }

    @Nullable
    public CompiledSimpleColumn override(String table, String field, CompiledRow rowKeys) {
        int position = compiler.findOverridePosition(table, field, rowKeys);

        if (position > 0) {
            OverrideKey overrideKey = new OverrideKey(table, field, position);
            CompileKey compileKey = CompileKey.overrideKey(overrideKey);
            return compiler.compile(compileKey).cast(CompiledSimpleColumn.class);
        }

        return null;
    }

    public boolean canMatchOverride(String table) {
        return compiler.canMatchOverride(table);
    }

    public CompileContext with(CompiledTable table, boolean nested) {
        return with(table, nested, null);
    }

    public CompileContext with(CompiledTable table, boolean nested, CompiledTable layout) {
        return new CompileContext(compiler, key, table, null, nested, layout, function);
    }

    public CompileContext withFunction(Function function) {
        if (function instanceof UnaryOperator unaryOperator) {
            CompileUtil.verify(function.arguments().size() == 1,
                    "Operator %s requires 1 operand", unaryOperator.operationSymbol());
        } else if (function instanceof BinaryOperator binaryOperator) {
            CompileUtil.verify(function.arguments().size() == 2,
                    "Operator %s requires 2 operands", binaryOperator.operationSymbol());
        } else {
            com.epam.deltix.quantgrid.engine.compiler.function.Function doc = compiler.getFunctionSpec(function.name());
            doc.verifyArgumentCount(function.arguments().size());
        }

        return new CompileContext(compiler, key, promotedTable, compiledTable, nested, layout, function);
    }

    public Function function() {
        CompileUtil.verify(function != null, "Function is not set");
        return function;
    }

    public String functionName() {
        return function().name();
    }

    public int argumentCount() {
        return function().arguments().size();
    }

    public Formula argument(int index) {
        return function().arguments().get(index);
    }

    public String constStringArgument(int index) {
        Formula argument = argument(index);
        CompileUtil.verify(argument instanceof ConstText, getErrorForArgument(index, "expected const string"));
        return ((ConstText) argument).text();
    }


    public <T extends CompiledResult> CompiledSimpleColumn flattenArgument(T argument) {
        return flattenArguments(List.of(argument)).get(0);
    }

    public <T extends CompiledResult> CompiledSimpleColumn flattenArgument(T argument, String operationSymbol) {
        return flattenArguments(List.of(argument), operationSymbol).get(0);
    }

    public <T extends CompiledResult> List<CompiledSimpleColumn> flattenArguments(List<T> arguments) {
        return flattenArguments(arguments, function.operationSymbol());
    }

    /**
     * @param arguments to flat out. Assumed to be prepared with {@link CompileFunction#compileExpressions}
     */
    public <T extends CompiledResult> List<CompiledSimpleColumn> flattenArguments(List<T> arguments, String operationSymbol) {

        if (arguments.isEmpty()) {
            return List.of();
        }

        // if arguments prepared by compileExpressions or promoted together we can assume either all nested or none
        CompiledResult first = arguments.get(0);
        if (first instanceof CompiledNestedColumn nestedFirst) {
            CompileUtil.verify(arguments.stream().allMatch(CompiledNestedColumn.class::isInstance),
                    "Unexpected mixture nested and non nested arguments");

            arguments.forEach(c -> CompileUtil.verifySameLayout(c, nestedFirst,
                    "You cannot use %s with lists of different origin", operationSymbol));

            return arguments.stream().map(CompiledNestedColumn.class::cast).map(CompiledNestedColumn::flat).toList();
        } else {
            CompileUtil.verify(arguments.stream().allMatch(CompiledSimpleColumn.class::isInstance),
                    "Unexpected mixture nested and non nested arguments");

            return arguments.stream().map(CompiledSimpleColumn.class::cast).toList();
        }
    }

    /**
     * Method takes flat result of intra-row operation and nest it according to its arguments assuming that level of
     * nesting should be the same. If all the arguments are flat, result must be flat. If at least one is nested the
     * result will be nested.
     * @param arguments to adjust nesting with. Assumed to be prepared with {@link CompileFunction#compileExpressions}
     */
    public <T extends CompiledResult> CompiledResult nestResultIfNeeded(Expression result, List<T> arguments,
                                                                        List<FieldKey> dimensions) {
        if (arguments.isEmpty()) {
            return new CompiledSimpleColumn(result, dimensions);
        }
        arguments.forEach(c -> CompileUtil.verifySameLayout(c, arguments.get(0)));

        // if arguments prepared by compileExpressions or promoted together we can assume either all nested or none
        if (arguments.get(0) instanceof CompiledNestedColumn nestedColumn) {
            if (nestedColumn.hasCurrentReference()) {
                return new CompiledNestedColumn(
                        new SelectLocal(nestedColumn.currentReference(), result), nestedColumn.dimensions(), 0, 1);
            } else {
                return new CompiledNestedColumn(
                        new SelectLocal(result), nestedColumn.dimensions(), REF_NA, 0);
            }
        } else {
            return new CompiledSimpleColumn(result, dimensions);
        }
    }

    public <T extends CompiledResult> T compileArgument(int index, ResultValidator<T> validator) {
        Formula argument = argument(index);
        CompiledResult compiled = compileFormula(argument);

        ResultValidator<CompiledSimpleColumn> flatValidator =  validator.getFlatColValidator();
        try {
            if (flatValidator != null) {
              if (compiled instanceof CompiledNestedColumn) {
                  Expression expression = flatValidator.convert(flattenArgument(compiled)).node();
                  return (T) nestResultIfNeeded(expression, List.of(compiled), compiled.dimensions());
              } else {
                  return (T) flatValidator.convert(compiled);
              }
            } else {
                return validator.convert(compiled);
            }
        } catch (Throwable e) {
            throw new CompileError(getErrorForArgument(index, e.getMessage()));
        }
    }

    public CompiledResult compileFormula(Formula formula) {
        return compiler.compileFormula(this, formula);
    }

    private String getErrorForArgument(int index, String reason) {
        if (function instanceof UnaryOperator unaryOperator) {
            return "Invalid operand for operator %s: %s"
                    .formatted(unaryOperator.operation().getSymbol(), reason);
        }

        if (function instanceof BinaryOperator binaryOperator) {
            return "Invalid operand for operator %s: %s"
                    .formatted(binaryOperator.operation().getSymbol(), reason);
        }

        String argumentName = compiler.getFunctionSpec(function.name()).getArgumentName(index);
        return "Invalid function %s argument \"%s\": %s".formatted(function.name(), argumentName, reason);
    }

    /**
     * @return collected dimensions from all reachable formulas for the specified argument.
     */
    public List<FieldKey> collectArgument(int index) {
        return collect(argument(index));
    }

    public List<FieldKey> collectArguments(int from, int to) {
        List<FieldKey> dimensions = List.of();

        for (; from < to; from++) {
            List<FieldKey> dims = collectArgument(from);
            dimensions = combine(dimensions, dims);
        }

        return dimensions;
    }

    private List<FieldKey> collect(Formula formula) {
        if (key().isOverride()) {
            return List.of();
        }

        if (formula instanceof FieldReference reference && reference.table() instanceof QueryRow) {
            return List.of();
        }

        if (formula instanceof CurrentField reference) {
            return currentField(reference.field()).dimensions();
        }

        if (formula instanceof Function function && function.name().equals("ROW")) {
            return layout().dimensions();
        }

        List<FieldKey> dimensions = List.of();

        for (Formula argument : formula.arguments()) {
            dimensions = combine(dimensions, collect(argument));
        }

        return dimensions;
    }

    /**
     * @return combined dimensions.
     */
    public List<FieldKey> combine(CompiledResult left, CompiledResult right) {
        return combine(left.dimensions(), right.dimensions());
    }

    /**
     * @return combined dimensions.
     */
    public List<FieldKey> combine(List<FieldKey> left, List<FieldKey> right) {
        if (key.isOverride()) {
            CompileUtil.verify(left.isEmpty() && right.isEmpty());
        }

        if (left.equals(right)) {
            return left;
        }

        return compiler.combineDimensions(this, left, right);
    }

    /**
     * @return promoted result to the specified dimensions.
     */
    public CompiledResult promote(CompiledResult result, List<FieldKey> dimensions) {

        if (promotedTable != null || layout != null) {
            // Scalars are always simple. If needed alignWithNestedTable will wrap as nested.
            if (result instanceof CompiledSimpleColumn column && column.scalar() ) {
                CompiledTable source = (layout == null) ? promotedTable : layout;
                CompileUtil.verify(source.dimensions().containsAll(dimensions));
                Expression resultNode = source.scalar() ? ((CompiledSimpleColumn) result).node() : new Expand(source.node(), column.node());
                return new CompiledSimpleColumn(resultNode, dimensions);

                // Invariant: current fields and derived values are always flat.
                // Query or 3rd party tables are nested
            } else if (isContextTablePromoted() && result instanceof CompiledNestedColumn nestedColumn
                    && result.hasSameLayout(compiledTable)) {

                Expression colExp = nestedColumn.flat().node();
                Expression projected = new Projection(promotedTable.queryReference(), colExp);

                return new CompiledNestedColumn(
                        new SelectLocal(promotedTable.currentReference(), projected),
                        promotedTable.dimensions(), 0, 1);
            }
        }

        return compiler.promoteResult(this, result, dimensions);
    }

    public CompiledResult projectCurrentField(String fieldName) {
        CompileUtil.verify(promotedTable != null, "No context table");
        CompiledTable carry = promotedTable;
        List<FieldKey> dimensions = carry.dimensions();
        CompiledResult compiledResult = currentField(fieldName);
        CompiledResult result = promote(compiledResult, dimensions);

        if (compiledResult.scalar()) {
            // No need to adjust scalar to table layout it was already done by special case inside promote.
            return result;
        }

        if (result instanceof CompiledSimpleColumn column) {
            if (!carry.hasCurrentReference()) {
                return column;
            }

            Get reference = carry.currentReference();
            column = CompileUtil.projectColumn(reference, column.node(), dimensions);

            if (!nested) {
                return column;
            }

            SelectLocal select = new SelectLocal(reference, column.node());
            return new CompiledNestedColumn(select, dimensions, 0, 1);
        }

        CompiledTable table = (CompiledTable) result;
        CompileUtil.verify(!table.nested(), "Dereferencing a %s is not allowed",
                CompileUtil.getTypeDisplayName(table.getClass()));
        CompileUtil.verify(!nested, "Dereferencing a %s is not yet supported",
                CompileUtil.getTypeDisplayName(table.getClass()));
        CompileUtil.verify(!dimensions.isEmpty(), "Dereferencing a scalar %s is not yet supported",
                CompileUtil.getTypeDisplayName(table.getClass()));

        Plan projection = CompileUtil.projectFlatTable(table.node(), carry.currentReference());
        return table.withNode(projection).withDimensions(dimensions);
    }

    public CompiledResult projectQueryResult(CompiledTable carry, CompiledResult result) {
        List<FieldKey> dimensions = carry.dimensions();
        boolean nested = carry.nested();

        if (result instanceof CompiledSimpleColumn column) {
            column = CompileUtil.projectColumn(carry.queryReference(), column.node(), dimensions);

            if (!nested) {
                return column;
            }

            if (!carry.hasCurrentReference()) {
                SelectLocal select = new SelectLocal(column.node());
                return new CompiledNestedColumn(select, 0);
            }

            SelectLocal select = new SelectLocal(carry.currentReference(), column.node());
            return new CompiledNestedColumn(select, dimensions, 0, 1);
        }

        CompiledTable table = (CompiledTable) result;

        if (!table.nested()) {
            Plan projection = CompileUtil.projectFlatTable(table.node(), carry.queryReference());

            if (nested && !dimensions.isEmpty()) {
                Get reference = carry.currentReference();
                SelectLocal select = CompileUtil.selectColumns(reference, projection);
                return table.withCurrent(select, dimensions).withNested(true);
            }

            return table.withNode(projection).withDimensions(dimensions).withNested(nested);
        }

        CompileUtil.verify(this.promotedTable == null, "Dereferencing a %s within formula is not allowed",
                CompileUtil.getTypeDisplayName(table.getClass()));
        CompileUtil.verify(!nested, "Dereferencing a %s from a nested %s is not allowed",
                CompileUtil.getTypeDisplayName(table.getClass()),
                CompileUtil.getTypeDisplayName(carry.getClass()));


        if (!table.hasCurrentReference()) {
            SelectLocal select = CompileUtil.selectColumns(
                    new Expand(table.node(), new Constant(0)),
                    table.node());
            table = table.withCurrent(select, table.dimensions());
        }

        Plan projection = CompileUtil.projectNestedTable(table.node(),
                carry.queryReference(), table.currentReference());

        return table.withNode(projection).withDimensions(dimensions);
    }

    public ParsedTable parsedTable(String table) {
        return compiler.parsedObject(CompileKey.tableKey(table));
    }

    public boolean hasParsedTable(String table) {
        return compiler.hasParsedObject(CompileKey.tableKey(table));
    }

    public InputProvider inputProvider() {
        return compiler.inputProvider();
    }

    public Principal principal() {
        return compiler.principal();
    }

    public ParsedPython.Function pythonFunction(String name) {
        return compiler.getPythonFunction(name);
    }

    /**
     * Used to check if we can promote values derived from a compiledTable by projecting them on table queryReference.
     */
    public boolean isContextTablePromoted() {
        return promotedTable != null && compiledTable != null && promotedTable != compiledTable;
    }

    /**
     * Returns override row table when compiling a single override.
     * It contains a single row with the query reference to the row at which the override is being compiled.
     */
    public CompiledTable overrideRowTable() {
        OverrideKey key = key().overrideKey();
        CompileUtil.verify(compiler.canMatchOverride(key.table()),
                "Not allowed to use current fields and ROW() in overrides for manual table with keys or apply section");

        CompiledRow keys = compiler.findOverrideRowKeys(key.table(), key.position());
        List<Formula> arguments = new ArrayList<>();
        arguments.add(new TableReference(key.table()));

        for (int i = 0; i < keys.size(); i++) {
            if (keys.isDouble(i)) {
                double value = keys.getDouble(i);
                arguments.add(new ConstNumber(value));
            } else {
                String value = keys.getString(i);
                arguments.add(new ConstText(value));
            }
        }

        Function rowReference = new Function("RowReference", arguments);
        return compileFormula(rowReference).cast(CompiledTable.class);
    }
}
