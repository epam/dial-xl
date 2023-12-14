package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public interface CompiledTable extends CompiledResult {

    int REF_NA = -1;

    /**
     * @return name of the table associated with this compiled result
     */
    String name();

    /**
     * <pre>
     * table B
     *   [nested_table]    = A
     *   [nested_table_2]  = A.FILTER($[a] > [a])
     *   [nested_column]   = A[a]
     *   [nested_column_2] = A[a].FILTER($ > [a])
     * </pre>
     *
     * @return true if table is nested.
     */
    boolean nested();

    /**
     * @return node which produces the result of this table.
     */
    Plan node();

    /**
     * <pre>
     * table B
     *   dim [a] = RANGE(5)
     *   dim [b] = RANGE(7)
     *       [c] = A.FILTER($[a] > 0)           # dims: ()
     *       [d] = A.FILTER($[a] > [a])         # dims: (B.a)
     *       [e] = A.FILTER($[a] > [b])         # dims: (B.b)
     *       [f] = A.FILTER($[a] > [a] + [b])   # dims: (B.a, B.b)
     * </pre>
     *
     * @return dimensions of the table in which this table is compiled.
     */
    List<FieldKey> dimensions();

    int currentRef();

    default boolean hasCurrentReference() {
        return currentRef() != REF_NA;
    }

    /**
     * The current reference can be absent.
     * <pre>
     *  table B
     *    dim [a] = RANGE(5)
     *    dim [b] = RANGE(7)
     *        [c] = A.FILTER($[a] > 0)           # current: (none), query: A
     *        [d] = A.FILTER($[a] > [a])         # current: (B.a), query: A
     *        [e] = A.FILTER($[a] > [b])         # current: (B.b), query: A
     *        [f] = A.FILTER($[a] > [a] + [b])   # current: (B.a x B.b), query: A
     * </pre>
     *
     * @return current reference of this table.
     * @throws com.epam.deltix.quantgrid.engine.compiler.CompileError if absent.
     */
    default Get currentReference() {
        CompileUtil.verify(hasCurrentReference(), "No current reference");
        return new Get(node(), currentRef());
    }

    int queryRef();

    default boolean hasQueryReference() {
        return queryRef() != REF_NA;
    }

    /**
     * The query reference is always present in Table but absent in NestedColumn.
     *
     * @return query reference of this table.
     * @throws com.epam.deltix.quantgrid.engine.compiler.CompileError if absent.
     */
    default Get queryReference() {
        CompileUtil.verify(hasQueryReference(), "No query reference");
        return new Get(node(), queryRef());
    }

    CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested);

    /**
     * @return compiled field with the specified name.
     */
    CompiledResult field(CompileContext context, String name);

    default List<String> fields(CompileContext context) {
        return List.of();
    }

    default List<String> keys(CompileContext context) {
        return List.of();
    }

    /**
     * Drops current part in a table if present and changes nested to false.
     *
     * @return flat result. NestedColumn -> Column, Table(nested=true) -> Table(nested=false).
     */
    default CompiledResult flat() {
        CompileUtil.verify(nested(), "Nested table is not nested");

        if (hasCurrentReference()) {
            CompileUtil.verifyReferences(currentRef(), queryRef());
            SelectLocal select = CompileUtil.selectColumns(node(), queryRef());
            return with(select, dimensions(), REF_NA, 0, false);
        }

        return with(node(), dimensions(), REF_NA, queryRef(), false);
    }

    /**
     * Sets current part with new node and dimensions to this table.
     * <pre>
     * table B
     *   dim [a] = RANGE(5)
     *       [b] = A.FILTER($[a] > 0)           # no current part
     *       [c] = [b].FILTER($[a] > [a])       # set current part for [b] when compiling source of Filter.
     * </pre>
     *
     * @return table with current part.
     */
    default CompiledTable withCurrent(Plan newNode, List<FieldKey> newDimensions) {
        CompileUtil.verify(!hasCurrentReference());
        CompileUtil.verify(node().getMeta().getSchema().size() + 1 == newNode.getMeta().getSchema().size());
        return with(newNode, newDimensions, 0, hasQueryReference() ? queryRef() + 1 : REF_NA, nested());
    }

    default CompiledTable withNode(Plan newNode) {
        return withNode(newNode, false);
    }

    default CompiledTable withNode(Plan newNode, boolean allowSchemaExpansion) {
        if (allowSchemaExpansion) {
            CompileUtil.verify(node().getMeta().getSchema().size() <= newNode.getMeta().getSchema().size());
        } else {
            CompileUtil.verify(node().getMeta().getSchema().size() == newNode.getMeta().getSchema().size());
        }

        return with(newNode, dimensions(), currentRef(), queryRef(), nested());
    }

    default CompiledTable withDimensions(List<FieldKey> newDimensions) {
        return with(node(), newDimensions, currentRef(), queryRef(), nested());
    }

    default CompiledTable withNested(boolean nested) {
        return with(node(), dimensions(), currentRef(), queryRef(), nested);
    }
}
