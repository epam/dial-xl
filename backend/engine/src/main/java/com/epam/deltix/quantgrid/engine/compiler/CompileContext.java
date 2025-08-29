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
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
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

    protected final List<FieldKey> dimensions;
    @Nullable
    protected final Formula placeholder;
    @Nullable
    protected final Function function;

    public CompileContext(Compiler compiler) {
        this(compiler, CompileKey.tableKey(Compiler.DIMENSIONAL_SCHEMA_REQUEST_TABLE_NAME));
    }

    public CompileContext(Compiler compiler, CompileKey key) {
        this(compiler, key, List.of(), null, null);
    }

    public CompileContext(Compiler compiler, CompileKey key, List<FieldKey> dimensions,
                          @Nullable Formula placeholder, @Nullable Function function) {
        this.compiler = compiler;
        this.key = key;
        this.dimensions = dimensions;
        this.placeholder = placeholder;
        this.function = function;
    }

    public long computationId() {
        return compiler.computationId();
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

    public CompiledTable scalarLayout() {
        return compiler.scalar();
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
            throw new CompileError("Cannot access current row's [%1$s] outside of column formula. Try %2$s[%1$s]?".formatted(
                    field,
                    key.table()));
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

    public CompiledResult format(CompiledResult result, FieldKey fieldKey) {
        return compiler.format(result, fieldKey);
    }

    public boolean canMatchOverride(String table) {
        return compiler.canMatchOverride(table);
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

        return new CompileContext(compiler, key, dimensions, placeholder, function);
    }

    public CompileContext withDimensions(List<FieldKey> dimensions) {
        return new CompileContext(compiler, key, dimensions, placeholder, function);
    }

    public CompileContext withPlaceholder(Formula placeholder) {
        return new CompileContext(compiler, key, dimensions, placeholder, function);
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
        CompileUtil.verify(argument instanceof ConstText, getErrorForArgument(index, "constant text is expected, like \"Example\""));
        return ((ConstText) argument).text();
    }

    public List<String> constStringListArgument(int index) {
        Formula argument = argument(index);

        if (argument instanceof Function func && func.name().equals("LIST")) {
            List<String> list = new ArrayList<>();
            for (Formula arg : func.arguments()) {
                if (arg instanceof ConstText text) {
                    list.add(text.text());
                    continue;
                }

                throw new CompileError("text list is expected, like: {\"One\", \"Two\"}");
            }
            return list;
        }

        throw new CompileError("text list is expected, like: {\"One\", \"Two\"}");
    }

    public CompiledResult lookupResult(Formula formula) {
        return compiler.lookupResult(formula);
    }

    public <T extends CompiledResult> T compileArgument(int index, ResultValidator<T> validator) {
        Formula argument = argument(index);
        CompiledResult compiled = compileFormula(argument);

        try {
            return validator.convert(compiled);
        } catch (Throwable e) {
            String message = CompiledTable.class.isAssignableFrom(validator.getExpectedType())
                    && compiled instanceof CompiledSimpleColumn
                    && argument instanceof CurrentField currentField
                    ? e.getMessage() + " Did you mean " + key.table() + "[" + currentField.field() + "]?"
                    : e.getMessage();
            throw new CompileError(getErrorForArgument(index, message), e);
        }
    }

    public CompiledResult compileFormula(Formula formula) {
        try {
            return compiler.compileFormula(this, formula);
        } catch (Throwable e) {
            if (placeholder instanceof TableReference tableReference
                    && formula instanceof CurrentField currentField
                    && !hasParsedField(key().table(), currentField.field())
                    && hasParsedField(tableReference.table(), currentField.field())) {
                String message = e.getMessage() +
                        " Did you mean " + tableReference.table() + "[" + currentField.field() + "]?";
                throw new CompileError(message, e);
            }

            if (!(e instanceof CompileError)) {
                throw new CompileError(e.getMessage(), e);
            }

            throw e;
        }
    }

    private String getErrorForArgument(int index, String reason) {
        if (function instanceof UnaryOperator unaryOperator) {
            return "Invalid operand for operator %s: %s"
                    .formatted(unaryOperator.operationSymbol(), reason);
        }

        if (function instanceof BinaryOperator binaryOperator) {
            return "Invalid operand for operator %s: %s"
                    .formatted(binaryOperator.operationSymbol(), reason);
        }

        String argumentName = getFunctionArgName(index);
        return "Invalid argument \"%s\" for function %s: %s".formatted(argumentName, function.name(), reason);
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

        return compiler.combineDimensions(this, left, right);
    }

    /**
     * @return promoted result to the specified dimensions.
     */
    public CompiledResult promote(CompiledResult result, List<FieldKey> dimensions) {
        return compiler.promoteResult(this, result, dimensions);
    }

    public CompiledResult projectQueryResult(CompiledTable carry, CompiledResult result, String field) {
        List<FieldKey> dimensions = carry.dimensions();
        boolean nested = carry.nested();

        if (result instanceof CompiledSimpleColumn column) {
            column = CompileUtil.projectColumn(carry.queryReference(), column.node(), dimensions, column.format());

            if (!nested) {
                return column;
            }

            if (!carry.hasCurrentReference()) {
                SelectLocal select = new SelectLocal(column.node());
                return new CompiledNestedColumn(select, 0, column.format());
            }

            SelectLocal select = new SelectLocal(carry.currentReference(), column.node());
            return new CompiledNestedColumn(select, dimensions, 0, 1, column.format());
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

        CompileUtil.verify(!nested,
                "Cannot access array of rows [%s] from another array of rows. Try flattening one of arrays using dim keyword.",
                field);

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

    public ParsedFields parsedField(String table, String field) {
        return compiler.parsedObject(CompileKey.fieldKey(table, field, false, false));
    }

    private boolean hasParsedField(String table, String field) {
        return compiler.hasParsedObject(CompileKey.fieldKey(table, field, false, false));
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
     * Returns override row table when compiling a single override.
     * It contains a single row with the query reference to the row at which the override is being compiled.
     */
    public CompiledTable overrideRowTable() {
        OverrideKey key = key().overrideKey();
        CompileUtil.verify(compiler.canMatchOverride(key.table()),
                "Not allowed to use current columns or use ROW() in overrides for manual table with keys or apply section");

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

    public CompiledResult align(CompiledTable current, CompiledResult result) {
        if (result instanceof CompiledSimpleColumn column) {
            Expression projection = column.scalar()
                    ? new Expand(current.node().getLayout(), column.node())
                    : new Projection(current.currentReference(), column.node());

            if (current.hasCurrentReference() && current.nested()) {
                Plan plan = new SelectLocal(current.currentReference(), projection);
                return new CompiledNestedColumn(plan, current.dimensions(), 0, 1, column.format());
            } else if (current.hasCurrentReference()) {
                return new CompiledSimpleColumn(projection, current.dimensions(), column.format());
            } else if (current.nested()) {
                Plan plan = new SelectLocal(projection);
                return new CompiledNestedColumn(plan, current.dimensions(), REF_NA, 0, column.format());
            } else {
                return new CompiledSimpleColumn(projection, current.dimensions(), column.format());
            }
        } else if (result instanceof CompiledTable table && !table.nested()) {
            throw new CompileError("Not supported yet");
        }

        return result;
    }

    public String getFunctionArgName(int index) {
        return compiler.getFunctionSpec(function.name()).getArgumentName(index);
    }
}
