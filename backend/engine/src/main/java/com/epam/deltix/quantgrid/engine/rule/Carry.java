package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.google.common.primitives.Ints;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

public class Carry implements Rule {

    private final Cache cache;

    public Carry(Cache cache) {
        this.cache = cache;
    }

    @Override
    public void apply(Graph graph) {
        Map<Node, List<Entry<?>>> chains = new HashMap<>();
        Map<Plan, Mapping> mappings = new HashMap<>();

        graph.visitIn(node -> collect(chains, mappings, node));
        chains.forEach(Carry::verify);
        graph.visitOut(node -> propagate(chains, mappings, node));
        // debug(graph, chains);
        graph.transformOut(node -> replace(chains, mappings, node));
    }

    private void collect(Map<Node, List<Entry<?>>> chains, Map<Plan, Mapping> mappings, Node node) {
        if (node instanceof Expression) {
            if (node instanceof Projection projection && projection.getKey() instanceof Get key) {
                Data data = add(chains, new Data(projection.getValue()));
                Leaf leaf = add(chains, new Leaf(projection, data));
                leaf.from = add(chains, new Branch(key.plan(), data, key.getColumn()));
            }

            return;
        }

        Plan plan = (Plan) node;

        Mapping mapping = new Mapping(plan, mappings);
        mappings.put(plan, mapping);

        List<Entry<?>> chain = get(chains, plan);
        Schema schema = plan.getMeta().getSchema();

        collectExisting(chain, plan);

        if (node instanceof Executed executed) {
            collectCached(chain, executed);
        }

        for (Entry<?> entry : chain) {
            Branch branch = (Branch) entry;
            Data data = branch.data;

            if (branch.replaceable) {
                continue;
            }

            Plan from = null;
            int ref = -1;

            if (schema.hasInput(branch.ref)) {
                int index = schema.getInput(branch.ref);
                ref = schema.getColumn(branch.ref);
                from = plan.plan(index);
                branch.input = index;
            } else if (plan instanceof SelectLocal select) {
                Expression expression = select.getExpression(branch.ref);

                if (expression instanceof RowNumber number) {
                    branch.replaceable = (number.getLayout() == data.node.getLayout()) && !data.node.depends(plan);
                } else if (expression instanceof Get get) {
                    from = get.plan();
                    ref = get.getColumn();
                }
            }

            if (from != null) {
                branch.from = add(chains, new Branch(from, data, ref));
            }
        }
    }

    /**
     * Collects existing columns in Running and Executed plans by identity.
     */
    private static void collectExisting(List<Entry<?>> chain, Plan plan) {
        Set<Identity> identities = plan.getIdentities();

        for (Entry<?> entry : chain) {
            Branch branch = (Branch) entry;
            List<Identity> ids = identify(plan, List.of(branch));

            loop:
            for (Identity identity : identities) {
                for (Identity id : ids) {
                    if (id.id().equals(identity.id())) {
                        Util.verify(id.columns().length == 1);
                        branch.replaceable = true;
                        branch.column = identity.columns()[0];
                        break loop; // look for the first match, all matches have the same result but different ids
                    }
                }
            }
        }
    }

    private void collectCached(List<Entry<?>> chains, Plan plan) {
        int position = plan.getMeta().getSchema().size();

        for (Entry<?> entry : chains) {
            Branch branch = (Branch) entry;

            if (!branch.replaceable) {
                List<Identity> ids = identify(plan, List.of(branch));

                for (Identity id : ids) {
                    Table result = cache.load(id);

                    if (result != null) {
                        Util.verify(result.getColumnCount() == 1);
                        branch.replaceable = true;
                        branch.column = position++;
                        branch.cached = result.getColumn(0);
                        break;
                    }
                }
            }
        }
    }

    private static void verify(Node node, List<Entry<?>> chain) {
        if (node instanceof Projection project) {
            int leafCount = 0;
            int dataCount = 0;

            for (Entry<?> entry : chain) {
                Util.verify(entry instanceof Leaf || entry instanceof Data);

                if (entry instanceof Leaf leaf) {
                    Util.verify(leaf.node == project);
                    Util.verify(++leafCount == 1);
                } else {
                    Data data = (Data) entry;
                    Util.verify(data.node == project);
                    Util.verify(++dataCount == 1);
                }
            }
        }

        if (node instanceof Get get) {
            Util.verify(chain.size() <= 1);

            for (Entry<?> entry : chain) {
                Util.verify(entry instanceof Data);
                Data data = (Data) entry;
                Util.verify(data.node == get);
            }
        }

        if (node instanceof Plan) {
            for (Entry<?> entry : chain) {
                Util.verify(entry instanceof Branch);
            }
        }
    }

    private static void propagate(Map<Node, List<Entry<?>>> chains, Map<Plan, Mapping> mappings, Node node) {
        List<Entry<?>> chain = get(chains, node);
        updateAndFilter(chain);

        if (node instanceof Plan plan) {
            for (Node output : plan.getOutputs()) {
                if (output instanceof Plan out) {
                    Mapping mapping = mappings.get(out);

                    for (Entry<?> entry : chain) {
                        Branch branch = (Branch) entry;
                        int input = out.getInputs().indexOf(plan);
                        int ref = mapping.find(input, branch.ref, false);

                        if (ref >= 0) {
                            add(chains, new Branch(out, branch, branch.data, ref, input));
                        }
                    }
                }
            }
        }
    }

    private static Node replace(Map<Node, List<Entry<?>>> chains, Map<Plan, Mapping> mappings, Node node) {
        List<Entry<?>> chain = get(chains, node);

        if (node instanceof Projection projection) {
            for (Entry<?> entry : chain) {
                if (entry instanceof Leaf leaf) {
                    Branch branch = leaf.from;
                    Get replacement = new Get(branch.node, branch.column);
                    return replace(chains, projection, replacement);
                }
            }

            return node;
        }

        if (node instanceof Get get) {
            Mapping mapping = mappings.get(get.plan());
            int column = mapping.map(get.getColumn());
            Get replacement = new Get(get.plan(), column);
            return replace(chains, get, replacement);
        }

        if (node instanceof Running) {
            for (Entry<?> entry : chain) {
                Branch branch = (Branch) entry;
                Util.verify(branch.column != -1);
                Util.verify(branch.replaceable);
            }

            return node;
        }

        if (node instanceof Executed executed) {
            if (chains.isEmpty()) {
                return executed; // remove when Value becomes Table
            }

            Table existing = (Table) executed.getResult();
            List<Column> columns = new ArrayList<>();
            List<ColumnType> types = new ArrayList<>();

            for (Entry<?> entry : chain) {
                Branch branch = (Branch) entry;
                Column cached = branch.cached;

                Util.verify(branch.column != -1);
                Util.verify(branch.replaceable);

                if (cached != null) {
                    columns.add(cached);
                    types.add(branch.data.node.getType());
                }
            }

            Schema schema = Schema.of(executed.getMeta().getSchema(), Schema.of(types.toArray(ColumnType[]::new)));
            Executed replacement = new Executed(executed.isLayout() ? null : executed.getLayout(),
                    new Meta(schema), existing.add(columns));

            Mapping mapping = mappings.remove(executed);
            mappings.put(replacement, mapping);

            List<Identity> identities = identify(executed, chain);
            replacement.getIdentities().addAll(identities);

            return replace(chains, executed, replacement);
        }

        if (node instanceof SelectLocal select) {
            ArrayList<Expression> expressions = new ArrayList<>(select.getExpressions());

            for (Entry<?> entry : chain) {
                Branch branch = (Branch) entry;
                Branch from = branch.from;

                if (branch.column >= 0) {
                    continue;
                }

                Expression expression = (from == null)
                        ? branch.data.node
                        : new Get(from.node, from.column);

                branch.column = find(expressions, expression);

                if (branch.column < 0) {
                    branch.column = expressions.size();
                    expressions.add(expression);
                }

                if (from != null) {
                    List<Identity> identities = identify(from.node, from.column);
                    expressions.get(branch.column).getIdentities().addAll(identities);
                }
            }

            SelectLocal replacement = new SelectLocal(expressions);
            Mapping mapping = mappings.remove(select);
            mappings.put(replacement, mapping);
            List<Identity> identities = identify(select, chain);
            replacement.getIdentities().addAll(identities);
            return replace(chains, select, replacement);
        }

        if (node instanceof Plan plan) {
            Mapping mapping = mappings.get(plan);
            mapping.update(plan);

            for (Entry<?> entry : chain) {
                Branch branch = (Branch) entry;
                branch.ref = mapping.map(branch.ref);
                branch.column = (branch.column >= 0)
                        ? mapping.map(branch.column)
                        : mapping.find(branch.input, branch.from.column, true);
            }

            List<Identity> identities = identify(plan, chain);
            plan.getIdentities().addAll(identities);
        }

        return node;
    }

    @SuppressWarnings("unchecked")
    private static <T extends Entry<?>> T add(Map<Node, List<Entry<?>>> chains, T entry) {
        List<Entry<?>> chain = chains.computeIfAbsent(entry.node, plan -> new ArrayList<>());

        for (Entry<?> existing : chain) {
            if (entry instanceof Leaf) {
                Util.verify(existing instanceof Data);
            }

            if (entry instanceof Data left && existing instanceof Data right) {
                Util.verify(left.node.getLayout() == right.node.getLayout());
                return (T) right;
            }

            if (entry instanceof Branch left && existing instanceof Branch right
                    && left.ref == right.ref && left.data.node == right.data.node) {

                Util.verify(left.node == right.node);
                return (T) existing;
            }
        }

        chain.add(entry);
        return entry;
    }

    @SuppressWarnings("unchecked")
    private static <T extends Node> Node replace(Map<Node, List<Entry<?>>> chains, T original, T replacement) {
        List<Entry<?>> entries = chains.remove(original);

        if (entries != null) {
            for (Entry<?> entry : entries) {
                Entry<T> adapter = (Entry<T>) entry;
                adapter.node = replacement;
            }

            chains.put(replacement, entries);
        }

        return replacement;
    }

    private static List<Entry<?>> get(Map<Node, List<Entry<?>>> chains, Node node) {
        return chains.getOrDefault(node, Collections.emptyList());
    }

    private static void updateAndFilter(List<Entry<?>> chain) {
        chain.removeIf(entry -> {
            if (entry instanceof Branch branch) {
                branch.replaceable |= (branch.from != null && branch.from.replaceable);
                return !branch.replaceable;
            }

            if (entry instanceof Leaf leaf) {
                return !leaf.from.replaceable;
            }

            return false;
        });
    }

    private static int find(List<Expression> list, Expression expression) {
        for (int i = 0; i < list.size(); i++) {
            Expression existing = list.get(i);
            if (existing.semanticEqual(expression, false)) {
                return i;
            }
        }

        return -1;
    }

    private static List<Identity> identify(Plan plan, int column) {
        List<Identity> ids = new ArrayList<>();

        for (Identity columnId : plan.getIdentities()) {
            if (columnId.columns().length == 1 && columnId.columns()[0] == column && !columnId.original()) {
                Identity id = new Identity(columnId.id(), false, column);
                ids.add(id);
            }
        }

        return ids;
    }

    private static List<Identity> identify(Plan node, List<Entry<?>> chain) {
        List<Identity> ids = new ArrayList<>();

        for (Entry<?> entry : chain) {
            Branch branch = (Branch) entry;
            Expression column = branch.data.node;

            List<Identity> nodeIds = node.getIdentities().stream().filter(Identity::original).toList();
            List<Identity> columnIds = column.getIdentities().stream().filter(Identity::original).toList();

            for (Identity nodeId : nodeIds) {
                int carryKey = Ints.indexOf(nodeId.columns(), branch.ref);
                if (carryKey < 0) {
                    continue;
                }

                for (Identity columnId : columnIds) {
                    Identity id = ProjectionUtil.identify(nodeId.id(), carryKey, columnId.id(), branch.column);
                    ids.add(id);
                }
            }
        }

        return ids;
    }

    private static class Entry<T extends Node> {
        T node;
    }

    private static class Branch extends Entry<Plan> {
        final Data data;

        Branch from;
        Column cached;
        int ref;
        int input = -1;
        int column = -1;
        boolean replaceable;

        Branch(Plan node, Data data, int ref) {
            this.node = node;
            this.data = data;
            this.ref = ref;
        }

        Branch(Plan node, Branch from, Data data, int ref, int input) {
            this.node = node;
            this.from = from;
            this.data = data;
            this.ref = ref;
            this.input = input;
        }

        @Override
        public String toString() {
            return "Branch(ref=" + ref + ",data = " + data.node.getId() + ")";
        }
    }

    private static class Leaf extends Entry<Projection> {
        final Data data;
        Branch from;

        public Leaf(Projection node, Data data) {
            this.data = data;
            this.node = node;
        }

        @Override
        public String toString() {
            return "Leaf(data=" + data.node.getId() + ")";
        }
    }

    private static class Data extends Entry<Expression> {

        public Data(Expression node) {
            this.node = node;
        }

        @Override
        public String toString() {
            return "Data(data=" + node.getId() + ")";
        }
    }

    private static class Mapping {

        private final Map<Plan, Mapping> mappings;
        private Schema schema;
        private int[] mapping;

        Mapping(Plan plan, Map<Plan, Mapping> mappings) {
            this.mappings = mappings;
            this.schema = plan.getMeta().getSchema();
            this.mapping = IntStream.range(0, schema.size()).toArray();
        }

        void update(Plan plan) {
            Schema updated = plan.getMeta().getSchema();

            if (!schema.equals(updated)) {
                mapping = new int[schema.size()];

                for (int i = 0, j = 0; i < schema.size(); i++) {
                    if (!schema.hasInput(i)) {
                        mapping[i] = findOriginal(updated, j++);
                        continue;
                    }

                    int input = schema.getInput(i);
                    int column = schema.getColumn(i);

                    Plan source = (Plan) plan.getInputs().get(input);
                    int position = mappings.get(source).mapping[column];
                    mapping[i] = find(updated, input, position);
                }

                plan.update(mapping);
                schema = updated;
            }
        }

        int map(int oldIndex) {
            int index = mapping[oldIndex];
            Util.verify(index >= 0);
            return index;
        }

        int find(int input, int column, boolean required) {
            int index = find(schema, input, column);
            Util.verify(!required || index >= 0);
            return index;
        }

        static int find(Schema schema, int input, int column) {
            if (input >= 0 && column >= 0) {
                for (int i = 0; i < schema.size(); i++) {
                    if (schema.getInput(i) == input && schema.getColumn(i) == column) {
                        return i;
                    }
                }
            }

            return -1;
        }

        static int findOriginal(Schema schema, int number) {
            for (int i = 0, count = 0; i < schema.size(); i++) {
                if (!schema.hasInput(i) && number == count++) {
                    return i;
                }
            }

            throw new IllegalStateException("Can't find mapping for original column: " + number);
        }
    }

    /*private static void debug(Graph graph, Map<Node, List<Entry<?>>> chains) {
        StringBuilder sb = new StringBuilder();
        sb.append("digraph G {\n");

        Object2IntMap<Plan> colours = new Object2IntOpenHashMap<>();
        graph.visitOut(node -> {
            Plan layout = node.getLayout();
            int colour = colours.computeIfAbsent(layout, (Plan key) -> ColorUtil.generateUniqueColor(key.getId()));

            String tooltip = chains.getOrDefault(node, List.of()).stream().map(Object::toString).collect(
                    Collectors.joining(","));
            String shape = (node instanceof Plan) ? "rectangle" : "ellipse";
            String style = "filled";
            String color = "#" + Integer.toHexString(colour);

            sb.append(String.format(
                    "\t\"%s\" [label = \"%s\"] [tooltip = \"%s\"] [shape =\"%s\"] [style=\"%s\"] [fillcolor=\"%s\"];%n",
                    node.getId(), node, tooltip, shape, style, color));
        });
        graph.visitOut(node -> {
            for (int i = 0; i < node.getInputs().size(); ++i) {
                sb.append(String.format("\t\"%d\" -> \"%d\" [label=\"%d\"];%n",
                        node.getInputs().get(i).getId(), node.getId(), i));
            }
        });
        sb.append("}\n");
        System.out.println(sb);
    }*/
}