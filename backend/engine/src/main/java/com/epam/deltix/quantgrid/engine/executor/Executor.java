package com.epam.deltix.quantgrid.engine.executor;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.StoreLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
public class Executor {

    private final CompletableFuture<Void> completion = new CompletableFuture<>();
    private final Set<Executable> active = new HashSet<>();
    private final ReentrantLock lock = new ReentrantLock();

    private final ExecutorService service;
    private final ResultListener listener;
    private final Cache cache;

    private Graph graph = new Graph();
    private Graph execution;
    private boolean executed;

    public Executor(ExecutorService service, ResultListener listener, Cache cache) {
        this.service = service;
        this.listener = listener;
        this.cache = cache;
    }

    public CompletableFuture<Void> execute(Graph graph) {
        lock.lock();
        try {
            this.graph = graph;
            this.execution = buildExecution();

            GraphPrinter.print("Execution", execution);
            begin();

            return completion;
        } finally {
            lock.unlock();
        }
    }

    public Graph cancel() {
        lock.lock();
        try {
            finish(true);
        } finally {
            lock.unlock();
        }

        return buildExecuted();
    }

    private void begin() {
        if (execution.isEmpty()) {
            finish(false);
            return;
        }
        graph.visitOut(Node::invalidate);

        List<Executable> sources = execution.getNodes().stream()
                .filter(node -> node.getInputs().isEmpty())
                .map(Executable.class::cast)
                .toList();

        for (Executable source : sources) {
            schedule(source);
        }
    }

    private void finish(boolean cancelled) {
        if (!executed) {
            executed = true;

            if (cancelled) {
                completion.cancel(true);
            } else {
                completion.complete(null);
                Util.verify(graph.isEmpty());
            }
        }
    }

    private void schedule(Executable executable) {
        CompletableFuture<Value> task = (executable.plan instanceof Running running)
                ? running.getTask()
                : submit(executable);

        executable.task = task;
        executable.executed = false;

        active.add(executable);

        task.whenComplete((result, error) -> {
            broadcast(executable, result, error);
            update(executable, result, error);
        });
    }

    private CompletableFuture<Value> submit(Executable executable) {
        Task task = new Task();
        task.task = service.submit(() -> execute(executable, task));
        return task;
    }

    private void execute(Executable executable, CompletableFuture<Value> future) {
        Plan plan = executable.plan;

        try {
            Value value = plan.execute();
            future.complete(value);
        } catch (Throwable e) {
            log.warn("Plan {} with id {} failed: ", plan.getClass(), plan.getId(), e);
            future.completeExceptionally(e);
        }
    }

    private void update(Executable executable, Value value, Throwable error) {
        lock.lock();
        try {
            if (executed) {
                return;
            }

            active.remove(executable);

            Plan plan = executable.plan;
            Plan result;

            if (error == null) {
                result = new Executed(
                        plan.isLayout() ? null : plan.getLayout(),
                        new Meta(plan.getMeta().getSchema().asOriginal()),
                        value);
            } else {
                result = new Failed(
                        plan.isLayout() ? null : plan.getLayout(),
                        new Meta(plan.getMeta().getSchema().asOriginal()),
                        error);
            }

            executable.executed = true;
            executable.result = result;

            if (plan instanceof StoreLocal && value instanceof Table table) {
                for (Identity id : plan.getIdentities()) {
                    int[] columns = id.columns();
                    Table selected = table.select(columns);
                    cache.save(id, selected);
                }
            }

            graph.replace(plan, result);

            Set<Executable> dead = new HashSet<>();
            if (executable.getOutputs().isEmpty()) {
                graph.remove(executable.result);
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
                finish(false);
            }
        } catch (Throwable e) {
            log.error("Update threw exception: ", e);
        } finally {
            lock.unlock();
        }
    }

    private void broadcast(Executable executable, Value result, Throwable error) {
        lock.lock();
        try {
            if (executed) {
                return;
            }

            Plan plan = executable.plan;
            if (plan instanceof RetrieverResultLocal retrieverResultLocal) {
                listener.onSimilaritySearch(retrieverResultLocal.getKey(), (Table) result, extractError(error));
            } else if (plan instanceof SimilaritySearchLocal similaritySearch) {
                listener.onSimilaritySearch(similaritySearch.getKey(), (Table) result, extractError(error));
            } else if (plan instanceof ViewportLocal viewPort) {
                listener.onUpdate(
                        viewPort.getKey(),
                        viewPort.getStart(),
                        viewPort.getEnd(),
                        viewPort.isContent(),
                        (Table) result,
                        extractError(error), viewPort.getResultType());
            }
        } catch (Throwable e) {
            log.error("Failed to broadcast result: ", e);
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

    private Graph buildExecuted() {
        Map<Node, Node> map = new HashMap<>();
        Graph copy = new Graph();

        graph.visitOut(node -> {
            List<Node> inputs = node.getInputs().stream().map(map::get).toList();
            Node replacement = node.copy(inputs);
            map.put(node, replacement);
            copy.add(replacement);
        });

        for (Executable executable : active) {
            CompletableFuture<Value> task = executable.task;
            Plan plan = (Plan) map.get(executable.plan);
            List<Plan> inputs = executable.getInputs().stream()
                    .map(node -> (Executable) node).map(Executable::getResult)
                    .map(map::get).map(node -> (Plan) node)
                    .toList();

            Running running = new Running(plan, task, inputs, plan.isLayout() ? -1 : 0);
            copy.replace(plan, running);
        }

        return copy;
    }

    private static String extractError(Throwable error) {
        if (error == null) {
            return null;
        }

        String message = error.getMessage();
        return (message == null) ? "Failed to execute" : message;
    }

    @Getter
    @NotSemantic
    @RequiredArgsConstructor
    private static class Executable extends Node {

        private final Plan plan;
        private CompletableFuture<Value> task;
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
}
