package com.epam.deltix.quantgrid.engine.executor;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.node.plan.local.EmbeddingIndexLocal;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.event.Level;

import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@RequiredArgsConstructor
public class Executor {

    private final Set<Running> active = new HashSet<>();
    private final Stats stats = new Stats();

    private final ReentrantLock lock;
    private final ExecutorService service;
    private final ExecutorService indexService;
    private final ExecutionHandler handler;

    private AtomicBoolean paused = new AtomicBoolean(true);
    private Graph graph = new Graph();
    private Graph execution = new Graph();

    public void resume(Graph newGraph) {
        assert lock.isHeldByCurrentThread();
        assert paused.get();

        graph = newGraph;
        cancel();
        begin();
    }

    public Graph pause() {
        assert lock.isHeldByCurrentThread();
        assert execution.isEmpty() == graph.isEmpty();

        if (!paused.get()) {
            paused.set(true);
            graph.getNodes().forEach(node -> {
                if (node instanceof Running running) {
                    active.add(running);
                }
            });
            stats.onPause(graph, execution);
        }

        return graph;
    }

    private void cancel() {
        assert lock.isHeldByCurrentThread();

        Set<Plan> live = new HashSet<>();
        for (Node node : graph.getNodes()) {
            if (node instanceof Running running) {
                live.add(running.getOriginal());
            }
        }

        Set<Running> dead = new HashSet<>();
        for (Running running : active) {
            if (!live.contains(running.getOriginal())) {
                dead.add(running);
            }
        }

        for (Running running : dead) {
            running.getTask().cancel(true);
            handler.onCancel(running);
        }

        active.clear();
        stats.onCancel(dead);
    }

    private void begin() {
        assert lock.isHeldByCurrentThread();
        assert paused.get();

        if (graph.isEmpty()) {
            execution = new Graph();
            return;
        }

        execution = buildExecution();
        paused = new AtomicBoolean(false);

        stats.onResume(graph, execution);
        graph.visitOut(Node::invalidate);

        List<Executable> sources = execution.getNodes().stream()
                .filter(node -> node.getInputs().isEmpty())
                .map(Executable.class::cast)
                .toList();

        for (Executable source : sources) {
            schedule(source);
        }
    }

    private void schedule(Executable executable) {
        assert lock.isHeldByCurrentThread();
        assert !paused.get();

        Plan plan = executable.plan;
        Plan result;
        CompletableFuture<Value> task;

        if (plan instanceof Executed executed) {
            result = executed;
            task = CompletableFuture.completedFuture(executed.getResult());
        } else if (plan instanceof Failed failed) {
            result = failed;
            task = CompletableFuture.failedFuture(failed.getError());
        } else if (plan instanceof Running running) {
            result = running;
            task = running.getTask();
        } else {
            // copy inputs to make sure subsequent computations and optimizations won't affect running nodes
            List<Node> planIns = copyInputs(plan);
            List<Plan> runningIns = executable.getInputs().stream()
                    .map(node -> (Executable) node).map(Executable::getResult)
                    .toList();

            Running running = new Running(runningIns, plan);
            graph.replace(plan, running);

            plan.getInputs().clear();
            plan.getInputs().addAll(planIns);
            plan.getIdentities().addAll(running.getIdentities());

            result = running;
            task = submit(running);
            running.setTask(task);
        }

        executable.result = result;
        AtomicBoolean flag = paused; // capture current object which reference is changed across computation
        handler.onSchedule(plan, result);
        task.whenComplete((table, error) -> update(flag, executable, table, error));
    }

    private CompletableFuture<Value> submit(Running plan) {
        Task task = new Task();
        task.task = plan.getOriginal() instanceof EmbeddingIndexLocal
                ? indexService.submit(() -> execute(plan, task))
                : service.submit(() -> execute(plan, task));
        return task;
    }

    private void execute(Running plan, CompletableFuture<Value> future) {
        plan.setStartedAt(System.currentTimeMillis());

        try {
            Value value = plan.getOriginal().execute();
            future.complete(value);
        } catch (Throwable e) {
            log.warn("Plan {} with id {} failed: ", plan.getClass(), plan.getId(), e);
            future.completeExceptionally(e);
        }
    }

    private void update(AtomicBoolean paused, Executable executable, Value value, Throwable error) {
        if (paused.get()) {
            return;
        }

        lock.lock();
        try {
            if (paused.get()) {
                return;
            }

            Plan plan = executable.result;
            Plan result = plan;

            if (plan instanceof Running running) {
                result = (error == null) ? new Executed(running, value) : new Failed(running, error);
                graph.replace(running, result);
                stats.onComplete(result);
                running.getOriginal().getIdentities().addAll(result.getIdentities());
            }

            executable.executed = true;
            executable.result = result;

            handler.onComplete(plan, result);

            Set<Executable> dead = new HashSet<>();
            if (executable.getOutputs().isEmpty()) {
                graph.remove(result);
                dead.add(executable);
            }

            for (Node input : executable.getInputs()) {
                if (input.getOutputs().stream().allMatch(n -> ((Executable) n).isExecuted())) {
                    dead.add((Executable) input);
                }
            }

            dead.forEach(execution.getNodes()::remove);

            Set<Executable> ready = new HashSet<>();
            for (Node output : executable.getOutputs()) {
                if (output.getInputs().stream().allMatch(n -> ((Executable) n).isExecuted())) {
                    ready.add((Executable) output);
                }
            }
            ready.forEach(this::schedule);

            if (execution.isEmpty()) {
                pause();
            }
        } catch (Throwable e) {
            log.error("Update threw exception: ", e);
        } finally {
            lock.unlock();
        }
    }

    private Graph buildExecution() {
        Graph execution = new Graph();
        Map<Node, Set<Executable>> dependency = new HashMap<>();

        graph.visitOut(node -> {
            Set<Executable> dependencies = new LinkedHashSet<>();
            Set<Executable> layout = null;

            if (!node.isLayout()) {
                layout = dependency.get(node.getLayout());
                Util.verify(layout != null, "Missing required layout");
                Util.verify(layout.size() == 1, "Expected exactly one layout");
                dependencies.addAll(layout);
            }

            for (Node input : node.getInputs()) {
                Set<Executable> ins = dependency.get(input);
                dependencies.addAll(ins);
            }

            if (node instanceof Expression) {
                dependency.put(node, dependencies);
            }

            if (node instanceof Plan plan) {
                Executable executable = new Executable(plan);
                executable.getInputs().addAll(dependencies);
                execution.add(executable);

                Set<Executable> dependent = new HashSet<>();
                if (layout != null) {
                    dependent.addAll(layout);
                }

                dependent.add(executable);
                dependency.put(node, dependent);
            }
        });

        return execution;
    }

    private List<Node> copyInputs(Plan plan) {
        Map<Node, Node> copies = new HashMap<>();
        return plan.getInputs().stream().map(in -> copy(in, copies)).toList();
    }

    private static Node copy(Node node, Map<Node, Node> copies) {
        Util.verify(node instanceof Expression || node instanceof Executed || node instanceof Failed);
        Node copy = copies.get(node);
        if (copy != null) {
            return copy;
        }

        List<Node> ins = node.getInputs().stream().map(input -> copy(input, copies)).toList();
        copy = node.copy(ins);
        copies.put(node, copy);
        return copy;
    }

    @Getter
    @NotSemantic
    @RequiredArgsConstructor
    private static class Executable extends Node {

        private final Plan plan;
        private Plan result;
        private boolean executed;

        @Override
        protected Plan layout() {
            return plan.getLayout();
        }

        @Override
        public String toString() {
            return "Executable(" + plan.getId() + ")";
        }
    }

    private static class Task extends CompletableFuture<Value> {

        Future<?> task;

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            task.cancel(mayInterruptIfRunning);
            return super.cancel(mayInterruptIfRunning);
        }
    }

    private static class Stats {

        private final PriorityQueue<Record> completed = new PriorityQueue<>(11,
                Comparator.comparingLong(Record::total));

        private long startedAt;
        private long stoppedAt;
        private int ready;
        private int total;

        void onResume(Graph graph, Graph execution) {
            completed.clear();
            startedAt = System.currentTimeMillis();
            stoppedAt = 0;
            ready = 0;
            total = 0;

            int running = 0;
            for (Node node : execution.getNodes()) {
                Executable executable = (Executable) node;
                Plan plan = executable.getPlan();

                if (plan instanceof Executed || plan instanceof Failed) {
                    continue;
                }

                if (plan instanceof Running) {
                    running++;
                }

                total++;
            }

            log.info("Execution resumed. Running/Completed/Total: {}/{}/{}", running, ready, total);
            GraphPrinter.print(Level.INFO, "Resumed graph", graph);
            GraphPrinter.print(Level.DEBUG, "Execution graph", graph);
        }

        void onPause(Graph graph, Graph execution) {
            stoppedAt = System.currentTimeMillis();
            int running = (int) execution.getNodes().stream().filter(node -> node instanceof Running).count();
            log.info("Execution paused. Running/Completed/Total: {}/{}/{}. Time: {} ms{}",
                    running, ready, total, stoppedAt - startedAt, top(completed, "completed"));
            GraphPrinter.print(Level.INFO, "Paused graph", graph);
        }

        void onCancel(Set<Running> active) {
            if (active.isEmpty()) {
                return;
            }

            PriorityQueue<Record> top = new PriorityQueue<>(11,
                    Comparator.comparingLong(Record::total));

            for (Running plan : active) {
                top.add(Record.of(plan, stoppedAt));

                if (top.size() > 10) {
                    top.poll();
                }
            }

            log.info("Execution cancelled. Canceled: {}{}", active.size(), top(top, "canceled"));
        }

        void onComplete(Plan plan) {
            ready++;

            Record record = Record.of(plan, stoppedAt);
            completed.add(record);

            if (completed.size() > 10) {
                completed.poll();
            }
        }

        private static String top(Collection<Record> records, String type) {
            int pendingSize = Long.toString(records.stream().map(Record::pending).reduce(0L, Long::max)).length();
            int executionSize = Long.toString(records.stream().map(Record::execution).reduce(0L, Long::max)).length();
            String template = "\n\t\t%" + executionSize + "s/%-" + pendingSize + "s ms: %s";

            StringBuilder builder = new StringBuilder();
            builder.append("\n\tTop ").append(records.size()).append(" ").append(type).append(" (execution/pending):");

            records.stream().sorted(Comparator.comparingLong(Record::execution).reversed()).forEach(record -> {
                String text = record.plan.toString().replace("\n", "");
                String row = template.formatted(record.execution, record.pending, text);
                builder.append(row);
            });

            return builder.toString();
        }

        private record Record(Plan plan, long pending, long execution, long total) {

            public Record(Plan plan, long pending, long execution) {
                this(plan, pending, execution, pending + execution);
            }

            public static Record of(Plan plan, long stopped) {
                if (plan instanceof Running running) {
                    long scheduled = running.getScheduledAt();
                    long started = running.getStartedAt();
                    return new Record(running.getOriginal(), started - scheduled, stopped - started);
                }

                if (plan instanceof Executed executed) {
                    return new Record(executed.getOriginal(),
                            executed.getStartedAt() - executed.getScheduledAt(),
                            executed.getStoppedAt() - executed.getStartedAt());
                }

                if (plan instanceof Failed failed) {
                    return new Record(failed.getOriginal(),
                            failed.getStartedAt() - failed.getScheduledAt(),
                            failed.getStoppedAt() - failed.getStartedAt());
                }

                throw new IllegalArgumentException();
            }
        }
    }
}
