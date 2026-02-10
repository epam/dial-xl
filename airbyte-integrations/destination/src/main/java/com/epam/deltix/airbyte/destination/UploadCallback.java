package com.epam.deltix.airbyte.destination;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

public class UploadCallback implements Callback {
    private final CompletableFuture<Response> responseFuture = new CompletableFuture<>();

    @Override
    public void onFailure(@NotNull Call call, @NotNull IOException e) {
        responseFuture.completeExceptionally(e);
    }

    @Override
    public void onResponse(@NotNull Call call, @NotNull Response response) {
        responseFuture.complete(response);
    }

    public void await() throws Exception {
        Response response = responseFuture.get();
        if (!response.isSuccessful()) {
            String bodyText = response.body() != null ? response.body().string() : "";
            throw new IOException("Failed to upload CSV (HTTP " + response.code() + "): " + bodyText);
        }
    }
}
