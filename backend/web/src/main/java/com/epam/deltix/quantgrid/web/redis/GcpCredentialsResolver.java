package com.epam.deltix.quantgrid.web.redis;

import com.google.cloud.iam.credentials.v1.GenerateAccessTokenResponse;
import com.google.cloud.iam.credentials.v1.IamCredentialsClient;
import com.google.cloud.iam.credentials.v1.IamCredentialsSettings;
import com.google.protobuf.Duration;
import lombok.SneakyThrows;
import org.redisson.config.Credentials;
import org.redisson.config.CredentialsResolver;

import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class GcpCredentialsResolver implements CredentialsResolver {

    private static final long SAFE_INTERVAL = TimeUnit.SECONDS.toMillis(10);
    private static final Duration LIFETIME = Duration.newBuilder().setSeconds(TimeUnit.MINUTES.toSeconds(5)).build();
    private static final List<String> SCOPES = List.of("https://www.googleapis.com/auth/cloud-platform");

    private final IamCredentialsClient client;
    private final String account;
    private final AtomicReference<CompletableFuture<Result>> reference = new AtomicReference<>();

    @SneakyThrows
    public GcpCredentialsResolver(String account) {
        IamCredentialsSettings settings = IamCredentialsSettings.newHttpJsonBuilder().build();
        this.account = account;
        this.client = IamCredentialsClient.create(settings);
    }

    @Override
    public CompletionStage<Credentials> resolve(InetSocketAddress address) {
        CompletableFuture<Result> future = reference.get();

        if (future != null) {
            try {
                Result result = future.getNow(null);
                boolean pendingOrCached = (result == null || System.currentTimeMillis() < result.expiration());

                if (pendingOrCached) {
                    return future.thenApply(Result::credentials);
                }
            } catch (Throwable e) {
                // run new task in case of failure
            }
        }

        CompletableFuture<Result> newFuture = new CompletableFuture<>();
        CompletableFuture<Result> oldFuture = reference.compareAndExchange(future, newFuture);
        boolean runNewTask = (future == oldFuture);

        if (runNewTask) {
            future = newFuture.completeAsync(() -> {
                GenerateAccessTokenResponse response = client.generateAccessToken(account, List.of(), SCOPES, LIFETIME);
                Credentials credentials = new Credentials(null, response.getAccessToken());
                long expiration = TimeUnit.SECONDS.toMillis(response.getExpireTime().getSeconds()) - SAFE_INTERVAL;
                return new Result(expiration, credentials);
            });
        } else {
            future = oldFuture;
        }

        return future.thenApply(Result::credentials);
    }

    private record Result(long expiration, Credentials credentials) {
    }
}