package com.epam.deltix.quantgrid.web.service.compute;

import com.epam.deltix.quantgrid.util.SecurityUtils;
import com.epam.deltix.quantgrid.web.config.ClusterSettings;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.sse.EventSource;
import okhttp3.sse.EventSourceListener;
import okhttp3.sse.EventSources;
import org.apache.commons.lang3.tuple.Pair;
import org.epam.deltix.proto.Api;
import org.jetbrains.annotations.NotNull;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

@Slf4j
@Service
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class RemoteComputeService implements ComputeService {

    private static final int OPERATION_EXPIRATION_DELAY = 1000;

    private final ClusterSettings settings;
    private final ClusterApi cluster;
    private final OkHttpClient okHttpClient;

    public RemoteComputeService(
            ClusterSettings settings,
            RedissonClient redis,
            OkHttpClient okHttpClient) {
        this.settings = settings;
        this.cluster = new ClusterApi(redis, settings.getNamespace());
        this.okHttpClient = okHttpClient;
        log.info("Cluster. Settings: {}", settings);
    }

    @Override
    public long timeout() {
        return settings.getNodeOperationTimeout() + OPERATION_EXPIRATION_DELAY;
    }

    private String generateComputationId() {
        return "computation-" + UUID.randomUUID().toString().replace("-", "").toLowerCase();
    }

    @SneakyThrows
    private String beginComputation(String projectId, String computationId) {
        long deadline = System.currentTimeMillis() + settings.getNodeRouteTimeout();
        long period = 16;

        while (true) {
            String endpoint = cluster.beginComputeOperation(projectId, settings.getNodeProjectTimeout(),
                    computationId, settings.getNodeOperationTimeout() + OPERATION_EXPIRATION_DELAY);

            if (endpoint != null) {
                return endpoint;
            }

            if (System.currentTimeMillis() >= deadline) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No computation power");
            }

            Thread.sleep(period);
            period = Math.min(2 * period, 128);
        }
    }

    private void completeComputation(String computationId) {
        try {
            boolean ok = cluster.completeComputeOperation(computationId);
            if (!ok) {
                log.warn("Failed to complete computation operation: {}", computationId);
            }
        } catch (Throwable e) {
            log.warn("Failed to complete computation operation: ", e);
        }
    }

    @Override
    public ComputeTask compute(Api.Request apiRequest, ComputeCallback callback, Principal principal) {
        String projectId = apiRequest.getCalculateWorksheetsRequest().getProjectName();
        return exec(principal, apiRequest, projectId, "/v1/calculate", (request, future) -> {
            ComputationEventSourceListener listener = new ComputationEventSourceListener(future, callback);
            EventSource.Factory factory = EventSources.createFactory(okHttpClient);
            EventSource source = factory.newEventSource(request, listener);

            future.whenComplete((result, error) -> {
                if (error == null) {
                    callback.onComplete();
                } else {
                    callback.onFailure(error);
                }
            });

            return source::cancel;
        });
    }

    @Override
    public Api.Response search(Api.Request apiRequest, Principal principal) {
        String projectId = apiRequest.getSimilaritySearchRequest().getProject();
        return exec(principal, apiRequest, projectId, "/v1/similarity_search", (request, future) -> {
            try (Response response = okHttpClient.newCall(request).execute()) {
                String body = response.body().string();

                if (!response.isSuccessful()) {
                    throw new ResponseStatusException(HttpStatusCode.valueOf(response.code()), body);
                }

                return ApiMessageMapper.toApiResponse(body);
            }
        });
    }

    @Override
    public void download(Api.Request apiRequest, Supplier<OutputStream> output, Principal principal) {
        String projectId = apiRequest.getDownloadRequest().getProject();
        exec(principal, apiRequest, projectId, "/v1/download", (request, future) -> {
            try (Response response = okHttpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new ResponseStatusException(HttpStatusCode.valueOf(response.code()),
                            response.body().string());
                }

                try (InputStream in = response.body().byteStream(); OutputStream out = output.get()) {
                    in.transferTo(out);
                }
            }

            return null;
        });
    }

    @SneakyThrows
    private <T> T exec(Principal principal, Api.Request apiRequest,
                       String projectId, String path,
                       ExecFunction<T> function) {

        String computationId = generateComputationId();
        log.info("Cluster. Begin. Project: {}. Operation: {}", projectId, computationId);

        String endpoint = beginComputation(projectId, computationId);
        String url = "http://%s%s".formatted(endpoint, path);
        log.info("Cluster. Send. Project: {}. Node: {}. Operation: {}", projectId, endpoint, computationId);

        byte[] body = ApiMessageMapper.fromApiRequest(apiRequest).getBytes(StandardCharsets.UTF_8);
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);
        Request.Builder requestBuilder = new Request.Builder()
                .url(url)
                .post(RequestBody.create(body))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE);

        if (authorization != null) {
            requestBuilder.header(authorization.getKey(), authorization.getValue());
        }

        CompletableFuture<Void> future = new CompletableFuture<>();
        future.whenComplete((result, error) -> {
            completeComputation(computationId);

            if (error == null) {
                log.info("Cluster. Complete. Project: {}. Node: {}. Operation: {}", projectId, endpoint, computationId);
            } else {
                log.info("Cluster. Error. Project: {}. Node: {}. Operation: {}. Error: {}", projectId, endpoint,
                        computationId, error.getMessage());
            }
        });

        try {
            Request httpRequest = requestBuilder.build();
            return function.apply(httpRequest, future);
        } catch (Throwable e) {
            future.completeExceptionally(e);
            throw e;
        }
    }

    private interface ExecFunction<T> {
        T apply(Request httpRequest, CompletableFuture<Void> future) throws Throwable;
    }

    private static class ComputationEventSourceListener extends EventSourceListener {
        private final CompletableFuture<Void> future;
        private final ComputeCallback callback;
        private volatile boolean done;

        public ComputationEventSourceListener(CompletableFuture<Void> future, ComputeCallback callback) {
            this.future = future;
            this.callback = callback;
        }

        @Override
        public void onEvent(@NotNull EventSource eventSource, String id, String type, @NotNull String data) {
            if (done) {
                throw new IllegalStateException("[DONE] message has already been received.");
            }

            if ("[DONE]".equals(data)) {
                done = true;
            } else {
                Api.Response response = ApiMessageMapper.toApiResponse(data);
                callback.onUpdate(response);
            }
        }

        @Override
        public void onClosed(@NotNull EventSource eventSource) {
            if (done) {
                future.complete(null);
            } else {
                InterruptedIOException error = new InterruptedIOException("The stream was interrupted.");
                future.completeExceptionally(error);
            }
        }

        @Override
        public void onFailure(@NotNull EventSource eventSource, Throwable error, Response response) {
            future.completeExceptionally(error);
        }
    }
}