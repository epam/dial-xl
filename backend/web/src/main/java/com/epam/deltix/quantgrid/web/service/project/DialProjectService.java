package com.epam.deltix.quantgrid.web.service.project;

import com.epam.deltix.quantgrid.parser.*;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.redisson.api.RLock;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.io.Closeable;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class DialProjectService implements ProjectService {

    private static final int CANCELLATION_DELAY = 5000;

    private final ConcurrentHashMap<String, Calculation> calculations = new ConcurrentHashMap<>();

    private final String namespace;
    private final TaskScheduler scheduler;
    private final RedissonClient redis;
    private final ComputeService service;
    private final DialFileApi dial;
    private final RTopic topic;

    public DialProjectService(ClusterSettings settings, TaskScheduler scheduler, RedissonClient redis,
                              ComputeService service, DialFileApi dial) {
        this.namespace = settings.getNamespace();
        this.scheduler = scheduler;
        this.redis = redis;
        this.service = service;
        this.dial = dial;
        this.topic = redis.getTopic(namespace + ".project_calculation_topic");
        this.topic.addListener(String.class, this::onMessage);
    }

    @Override
    public void calculate(Principal principal, Api.Request apiRequest) throws Exception {
        String path = apiRequest.getProjectCalculateRequest().getProject();
        String file = getProjectFile(path);

        checkPermissions(principal, file);
        RLock lock = redis.getLock(namespace + ".project_calculation_lock." + path);

        if (lock.tryLock()) {
            try {
                Calculation calculation = new Calculation(principal, path);
                Closeable subscription = subscribe(principal, file, calculation);

                calculations.put(path, calculation);
                long threadId = Thread.currentThread().getId();

                calculation.future.whenComplete((unused, error) -> {
                    try {
                        subscription.close();
                    } catch (Throwable e) {
                        log.warn("Failed to close project file subscription", e);
                    } finally {
                        calculations.remove(path);
                        lock.unlockAsync(threadId);
                    }
                });
            } catch (Throwable error) {
                log.warn("Project calculation failed", error);
                lock.unlock();
            }
        }
    }

    @Override
    public void cancel(Principal principal, Api.Request apiRequest) throws Exception {
        String path = apiRequest.getProjectCancelRequest().getProject();
        String file = getProjectFile(path);

        checkPermissions(principal, file);
        RLock lock = redis.getLock(namespace + ".project_calculation_lock." + path);

        if (lock.isLocked()) {
            topic.publish(ApiMessageMapper.fromApiRequest(apiRequest));
        }
    }

    private void onMessage(CharSequence channel, String message) {
        Api.Request apiRequest = ApiMessageMapper.parseRequest(message, Api.Request::getProjectCancelRequest,
                Api.ProjectCancelRequest.class);

        String path = apiRequest.getProjectCancelRequest().getProject();
        Calculation calculation = calculations.get(path);

        if (calculation != null) {
            calculation.close();
        }
    }

    private void checkPermissions(Principal principal, String file) throws Exception {
        DialFileApi.Attributes attributes;

        try {
            attributes = dial.getAttributes(file, true, false, null, principal);
        } catch (FileNotFoundException e) {
            throw e;
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to check project permissions");
        }

        if (!attributes.permissions().contains("WRITE")) {
            throw new IllegalArgumentException("No write permissions");
        }
    }

    @RequiredArgsConstructor
    private class Calculation implements Subscriber {

        private final CompletableFuture<Void> future = new CompletableFuture<>();
        private final Principal principal;
        private final String path;

        private ComputeService.ComputeTask task;
        private int updates;

        @Override
        public synchronized void onUpdate(Project project) {
            if (!future.isDone()) {
                try {
                    updates++;
                    cancel();
                    compute(project);
                } catch (Throwable error) {
                    close(error);
                }
            }
        }

        @Override
        public synchronized void onDelete() {
            if (!future.isDone()) {
                close();
            }
        }

        @Override
        public synchronized void onError(Throwable error) {
            if (!future.isDone()) {
                close(error);
            }
        }

        private synchronized void onComplete(Throwable error, int number) {
            if (!future.isDone() && updates == number) {
                close(error);
            }
        }

        public synchronized void close() {
            if (!future.isDone()) {
                close(null);
            }
        }

        private void close(Throwable error) {
            if (error != null) {
                log.warn("Project calculation failed", error);
            }

            cancel();
            future.complete(null);
        }

        private void cancel() {
            ComputeService.ComputeTask task = this.task;
            if (task != null) {
                this.task = null;
                scheduler.schedule(() -> {
                    try {
                        task.cancel();
                    } catch (Throwable error) {
                        log.warn("Failed to cancel project calculation", error);
                    }
                }, Instant.now().plusMillis(CANCELLATION_DELAY));
            }
        }

        private void compute(Project project) {
            Api.Request request = request(project);

            int number = updates;
            ComputeService.ComputeCallback callback = new ComputeService.ComputeCallback() {
                @Override
                public void onUpdate(Api.Response response) {
                }

                @Override
                public void onComplete() {
                    Calculation.this.onComplete(null, number);
                }

                @Override
                public void onFailure(Throwable error) {
                    Calculation.this.onComplete(error, number);
                }
            };
            task = service.compute(request, callback, principal);
        }

        private Api.Request request(Project project) {
            List<ParsedSheet> sheets = project.sheets().values().stream().map(SheetReader::parseSheet).toList();
            List<Api.Viewport> viewports = new ArrayList<>();

            for (ParsedSheet sheet : sheets) {
                for (ParsedTable table : sheet.tables()) {
                    for (ParsedFields fields : table.fields()) {
                        for (ParsedField field : fields.fields()) {
                            Api.FieldKey key = Api.FieldKey.newBuilder()
                                    .setTable(table.tableName())
                                    .setField(field.fieldName())
                                    .build();

                            Api.Viewport viewport = Api.Viewport.newBuilder()
                                    .setStartRow(0)
                                    .setEndRow(0)
                                    .setFieldKey(key)
                                    .build();

                            viewports.add(viewport);
                        }
                    }

                    int number = 0;
                    for (ParsedTotal total : table.totals()) {
                        number++;
                        for (ParsedFields fields : total.fields()) {
                            for (ParsedField field : fields.fields()) {
                                Api.TotalKey key = Api.TotalKey.newBuilder()
                                        .setTable(table.tableName())
                                        .setField(field.fieldName())
                                        .setNumber(number)
                                        .build();

                                Api.Viewport viewport = Api.Viewport.newBuilder()
                                        .setStartRow(0)
                                        .setEndRow(0)
                                        .setTotalKey(key)
                                        .build();

                                viewports.add(viewport);
                            }
                        }
                    }
                }
            }

            return Api.Request.newBuilder()
                    .setId(UUID.randomUUID().toString())
                    .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                            .setProjectName(path)
                            .putAllWorksheets(project.sheets())
                            .addAllViewports(viewports)
                            .setIncludeIndices(true)
                            .build())
                    .build();
        }
    }

    private Closeable subscribe(Principal principal, String file, Subscriber subscriber) throws Exception {
        DialFileApi.FileSubscriber listener = new FileListener(principal, file, subscriber);
        return dial.subscribeOnFileEvents(file, listener, principal);
    }

    private static String getProjectFile(String path) {
        if (path.isBlank() || path.endsWith("/") || !path.startsWith("files/")) {
            throw new IllegalArgumentException("path is invalid: " + path);
        }

        if (!path.endsWith(".qg")) {
            path = path + ".qg";
        }

        return path;
    }

    private interface Subscriber {
        void onUpdate(Project project);

        void onDelete();

        void onError(Throwable error);
    }

    private class FileListener implements DialFileApi.FileSubscriber {
        private final Principal principal;
        private final String projectPath;
        private final Subscriber subscriber;

        public FileListener(Principal principal, String path, Subscriber subscriber) {
            this.principal = principal;
            this.projectPath = path;
            this.subscriber = subscriber;
        }

        @Override
        public synchronized void onOpen() throws Throwable {
            sync(principal, projectPath, subscriber);
        }

        @Override
        public synchronized void onEvent(DialFileApi.FileEvent event) throws Throwable {
            sync(principal, event.path(), subscriber);
        }

        @Override
        public synchronized void onError(Throwable error) {
            subscriber.onError(error);
        }

        private void sync(Principal principal, String path, Subscriber subscriber) throws Throwable {
            try (EtaggedStream stream = dial.readFile(path, principal)) {
                String body = new String(stream.stream().readAllBytes());
                Project project = Project.fromYaml(body);
                subscriber.onUpdate(project);
            } catch (FileNotFoundException notFound) {
                subscriber.onDelete();
            }
        }
    }
}