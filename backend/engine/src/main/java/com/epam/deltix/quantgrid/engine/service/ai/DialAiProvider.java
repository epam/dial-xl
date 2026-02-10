package com.epam.deltix.quantgrid.engine.service.ai;

import com.epam.deltix.quantgrid.util.SecurityUtils;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.SneakyThrows;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.apache.commons.lang3.tuple.Pair;

import java.net.URI;
import java.security.Principal;
import java.util.List;

import static com.epam.deltix.quantgrid.engine.service.ai.AiUtil.MAPPER;

public class DialAiProvider implements AiProvider {

    private static final String CHAT_COMPLETION_PATH = "/openai/deployments/%s/chat/completions?api-version=2024-10-21";
    private static final String MODELS_PATH = "/openai/models";
    private static final MediaType JSON_TYPE = MediaType.parse("application/json");

    private final OkHttpClient client;
    private final URI url;

    public DialAiProvider(OkHttpClient client, String url) {
        this.client = client;
        this.url = URI.create(url);
    }

    @Override
    @SneakyThrows
    public List<String> models(Principal principal) {
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);

        Request request = new Request.Builder()
                .url(url.resolve(MODELS_PATH).toURL())
                .addHeader(authorization.getKey(), authorization.getValue())
                .get()
                .build();

        Response response = client.newCall(request).execute();
        String body = response.body().string();

        if (!response.isSuccessful()) {
            throw new IllegalStateException("response code: " + response.code() + ", body: " + body);
        }

        ModelsResponse responseBody = MAPPER.readValue(body, ModelsResponse.class);
        return responseBody.data.stream()
                .filter(model -> model.capabilities.chatCompletion)
                .map(Model::id)
                .sorted()
                .toList();
    }

    @Override
    @SneakyThrows
    public String generate(Principal principal, String model, String instruction, String prompt) {
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);

        Message systemMessage = new Message("system", instruction);
        Message userMessage = new Message("user", prompt);
        ChatCompletionRequest requestBody = new ChatCompletionRequest(List.of(systemMessage, userMessage), 0);

        Request request = new Request.Builder()
                .url(url.resolve(CHAT_COMPLETION_PATH.formatted(model)).toURL())
                .addHeader(authorization.getKey(), authorization.getValue())
                .post(RequestBody.create(MAPPER.writeValueAsString(requestBody), JSON_TYPE))
                .build();

        Response response = client.newCall(request).execute();
        String body = response.body().string();

        if (!response.isSuccessful()) {
            throw new IllegalStateException("response code: " + response.code() + ", body: " + body);
        }

        ChatCompletionResponse responseBody = MAPPER.readValue(body, ChatCompletionResponse.class);
        if (responseBody.choices().size() != 1) {
            throw new IllegalStateException("many choices " + responseBody.choices().size());
        }

        return responseBody.choices().get(0).message.content;
    }

    private record ChatCompletionRequest(List<Message> messages, int temperature) {
    }

    private record Message(String role, String content) {
    }

    private record ChatCompletionResponse(List<Choice> choices) {
    }

    private record Choice(Message message) {
    }

    private record ModelsResponse(List<Model> data) {
    }

    private record Model(String id, Capabilities capabilities) {
    }

    private record Capabilities(@JsonProperty("chat_completion") boolean chatCompletion) {
    }
}