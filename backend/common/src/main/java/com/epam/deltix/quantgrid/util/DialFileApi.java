package com.epam.deltix.quantgrid.util;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.sse.EventSource;
import okhttp3.sse.EventSourceListener;
import okhttp3.sse.EventSources;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpMessage;
import org.apache.http.HttpStatus;
import org.apache.http.StatusLine;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.Closeable;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.AccessDeniedException;
import java.security.Principal;
import java.util.ConcurrentModificationException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
public class DialFileApi implements AutoCloseable {
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    private final OkHttpClient okHttpClient;
    private final CloseableHttpClient httpClient;
    private final URI baseUriV1;

    public DialFileApi(String baseUri) {
        this(baseUri, new OkHttpClient());
    }

    public DialFileApi(String baseUri, OkHttpClient okHttpClient) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(15000)
                .setSocketTimeout(15000)
                .setConnectionRequestTimeout(15000)
                .build();

        this.okHttpClient = okHttpClient;
        this.httpClient = HttpClients.custom()
                .setDefaultRequestConfig(requestConfig)
                .setMaxConnTotal(256)
                .setMaxConnPerRoute(256)
                .setConnectionTimeToLive(10, TimeUnit.MINUTES)
                .evictExpiredConnections()
                .evictIdleConnections(5, TimeUnit.MINUTES)
                // Disable compression to improve download speed for large input files
                .disableContentCompression()
                .build();

        this.baseUriV1 = URI.create(baseUri).resolve("/v1/");
    }

    public String getBucket(Principal principal) throws IOException {
        HttpGet httpGet = new HttpGet(baseUriV1.resolve("bucket"));
        setAuthorizationHeader(httpGet, principal);

        return httpClient.execute(httpGet, response -> {
            try (InputStream stream = response.getEntity().getContent()) {
                StatusLine statusLine = response.getStatusLine();
                if (statusLine.getStatusCode() != HttpStatus.SC_OK) {
                    throw new IOException("Failed to retrieve user bucket: %s".formatted(statusLine.getReasonPhrase()));
                }

                Map<String, String> dict = MAPPER.readValue(stream, new TypeReference<>() {
                });
                return dict.get("bucket");
            }
        });
    }

    public Closeable subscribeOnFileEvents(String path, FileSubscriber subscriber,
                                           Principal principal) throws IOException {
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);
        byte[] body = MAPPER.writeValueAsBytes(new FilesSubscription(List.of(new FilePath(path))));

        Request request = new Request.Builder()
                .url(baseUriV1.resolve("ops/resource/subscribe").toURL())
                .post(RequestBody.create(body))
                .header("content-type", "application/json")
                .header(authorization.getKey(), authorization.getValue())
                .build();

        EventSource.Factory factory = EventSources.createFactory(okHttpClient);
        AtomicBoolean closed = new AtomicBoolean();
        EventSourceListener listener = new FileEventListener(closed, subscriber);
        EventSource source = factory.newEventSource(request, listener);

        return () -> {
            closed.set(true);
            source.cancel();
        };
    }

    public EtaggedStream readFile(String path, Principal principal) throws IOException {
        HttpGet httpGet = new HttpGet(baseUriV1.resolve(path));
        setAuthorizationHeader(httpGet, principal);

        CloseableHttpResponse response = httpClient.execute(httpGet);

        try {
            StatusLine statusLine = response.getStatusLine();

            if (statusLine.getStatusCode() == 404) {
                throw new FileNotFoundException("File does not exist: %s".formatted(path));
            }

            if (statusLine.getStatusCode() != 200) {
                throw new IOException("Failed to read file %s: %s".formatted(path, statusLine.getReasonPhrase()));
            }

            Header etag = response.getFirstHeader(HttpHeaders.ETAG);
            InputStream stream = response.getEntity().getContent();

            return new EtaggedStream(response, stream, (etag == null) ? null : etag.getValue());
        } catch (Throwable e) {
            EntityUtils.consumeQuietly(response.getEntity());
            response.close();
            throw e;
        }
    }

    public String writeFile(String path, String etag, BodyWriter writer, String contentType, Principal principal)
            throws IOException {
        HttpPut httpPut = new HttpPut(baseUriV1.resolve(path));
        setAuthorizationHeader(httpPut, principal);
        if (StringUtils.isNotBlank(etag)) {
            httpPut.setHeader(HttpHeaders.IF_MATCH, etag);
        } else {
            httpPut.setHeader(HttpHeaders.IF_NONE_MATCH, "*");
        }

        MultipartEntityBuilder entityBuilder = MultipartEntityBuilder.create();
        entityBuilder.addPart("file", new BinaryBody("file.txt", contentType, writer));
        httpPut.setEntity(entityBuilder.build());

        return httpClient.execute(httpPut, response -> {
            try (InputStream ignore = response.getEntity().getContent()) {

                StatusLine statusLine = response.getStatusLine();
                if (statusLine.getStatusCode() == HttpStatus.SC_PRECONDITION_FAILED) {
                    throw new ConcurrentModificationException(statusLine.getReasonPhrase());
                }
                if (statusLine.getStatusCode() == HttpStatus.SC_FORBIDDEN) {
                    throw new AccessDeniedException(statusLine.getReasonPhrase());
                }
                if (statusLine.getStatusCode() != HttpStatus.SC_OK) {
                    throw new IOException(
                            "Failed to upload file to %s: %s".formatted(path, statusLine.getReasonPhrase()));
                }
            }
            Header header = response.getFirstHeader(HttpHeaders.ETAG);
            return (header == null) ? null : header.getValue();
        });
    }

    public void deleteFile(String path, String etag, Principal principal)
            throws IOException {
        HttpDelete httpDelete = new HttpDelete(baseUriV1.resolve(path));
        setAuthorizationHeader(httpDelete, principal);
        if (StringUtils.isNotBlank(etag)) {
            httpDelete.setHeader(HttpHeaders.IF_MATCH, etag);
        } else {
            httpDelete.setHeader(HttpHeaders.IF_NONE_MATCH, "*");
        }

        httpClient.execute(httpDelete, response -> {
            try (InputStream ignore = response.getEntity().getContent()) {

                StatusLine statusLine = response.getStatusLine();
                if (statusLine.getStatusCode() == HttpStatus.SC_PRECONDITION_FAILED) {
                    throw new ConcurrentModificationException(statusLine.getReasonPhrase());
                }
                if (statusLine.getStatusCode() == HttpStatus.SC_FORBIDDEN) {
                    throw new AccessDeniedException(statusLine.getReasonPhrase());
                }
                if (statusLine.getStatusCode() == HttpStatus.SC_NOT_FOUND) {
                    throw new FileNotFoundException("File does not exist: %s".formatted(path));
                }
                if (statusLine.getStatusCode() != HttpStatus.SC_OK) {
                    throw new IOException(
                            "Failed to delete file at %s: %s".formatted(path, statusLine.getReasonPhrase()));
                }
            }
            return null;
        });
    }

    public Iterable<Attributes> listAttributes(String path, Principal principal) throws IOException {
        return () -> new Iterator<Attributes>() {
            private List<Attributes> currentAttributes = List.of();
            private int currentIndex;
            private String token;
            private boolean finished;

            @Override
            public boolean hasNext() {
                if (currentIndex < currentAttributes.size()) {
                    return true;
                }

                if (!finished) {
                    load();
                    return currentIndex < currentAttributes.size();
                }

                return false;
            }

            @Override
            public Attributes next() {
                if (!hasNext()) {
                    throw new NoSuchElementException();
                }

                return currentAttributes.get(currentIndex++);
            }

            @SneakyThrows
            public void load() {
                try {
                    Attributes attributes = getAttributes(path, false, true, token, principal);
                    currentAttributes = attributes.items();
                    token = attributes.nextToken();
                } catch (FileNotFoundException e) {
                    currentAttributes = List.of();
                    token = null;
                }

                currentIndex = 0;
                finished = StringUtils.isBlank(token);
            }
        };
    }

    public Attributes getAttributes(
            String path, boolean permissions, boolean recursive, String token, Principal principal) throws IOException {
        Map<String, String> args = new LinkedHashMap<>();
        if (permissions) {
            args.put("permissions", "true");
        }
        if (recursive) {
            args.put("recursive", "true");
        }
        if (StringUtils.isNotBlank(token)) {
            args.put("token", token);
        }
        Map<String, Object> metadata = readMetadata(path + formatArgs(args), principal);
        return Attributes.parse(metadata);
    }

    private static String formatArgs(Map<String, String> args) {
        if (args.isEmpty()) {
            return "";
        }

        return args.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&", "?", ""));
    }

    public boolean exists(String path, Principal principal) throws IOException {
        try {
            readMetadata(path, principal);
            return true;
        } catch (FileNotFoundException ignored) {
            return false;
        }
    }

    private Map<String, Object> readMetadata(String path, Principal principal) throws IOException {
        try (EtaggedStream stream = readFile("metadata/" + path, principal)) {
            return MAPPER.readValue(stream.stream(), new TypeReference<>() {
            });
        }
    }

    private static void setAuthorizationHeader(HttpMessage message, Principal principal) {
        Pair<String, String> authorization = SecurityUtils.getAuthorization(principal);
        message.setHeader(authorization.getKey(), authorization.getValue());
    }

    @Override
    public void close() throws Exception {
        httpClient.close();
    }

    public record Attributes(
            String etag,
            String name,
            String parentPath,
            Long updatedAt,
            List<String> permissions,
            String nextToken,
            List<Attributes> items) {
        public static Attributes parse(Map<String, Object> metadata) {
            String etag = (String) metadata.get("etag");
            String name = (String) metadata.get("name");
            String parent = (String) metadata.get("parentPath");
            Long updatedAt = (Long) metadata.get("updatedAt");
            @SuppressWarnings("unchecked")
            List<String> permissions = (List<String>) metadata.getOrDefault("permissions", List.of());
            String nextToken = (String) metadata.get("nextToken");
            @SuppressWarnings("unchecked")
            List<Attributes> items = ((List<Map<String, Object>>) metadata.getOrDefault("items", List.of())).stream()
                    .map(Attributes::parse)
                    .toList();

            return new Attributes(etag, name, parent, updatedAt, permissions, nextToken, items);
        }
    }

    private record FilesSubscription(List<FilePath> resources) {
    }

    private record FilePath(String url) {
    }

    public record FileEvent(@JsonAlias("url") String path, String etag, FileAction action, long timestamp) {
    }

    public enum FileAction {
        CREATE, UPDATE, DELETE
    }

    public interface FileSubscriber {
        void onOpen() throws Throwable;
        void onEvent(FileEvent event) throws Throwable;
        void onError(Throwable error);
    }

    @RequiredArgsConstructor
    private static class FileEventListener extends EventSourceListener {

        private final AtomicBoolean closed;
        private final FileSubscriber subscriber;

        @Override
        public void onOpen(@NotNull EventSource source, @NotNull Response response) {
            if (!closed.get()) {
                try {
                    subscriber.onOpen();
                } catch (Throwable e) {
                    onFailure(source, e, null);
                }
            }
        }

        @Override
        public void onClosed(@NotNull EventSource source) {
            if (!closed.get()) {
                IOException error = new IOException("connection is closed");
                onFailure(source, error, null);
            }
        }

        @Override
        public void onEvent(@NotNull EventSource source, @Nullable String id,
                            @Nullable String type, @NotNull String data) {
            if (!closed.get()) {
                try {
                    FileEvent event = MAPPER.readValue(data, FileEvent.class);
                    subscriber.onEvent(event);
                } catch (Throwable e) {
                    onFailure(source, e, null);
                }
            }
        }

        @Override
        public void onFailure(@NotNull EventSource source, @Nullable Throwable error, @Nullable Response response) {
            if (closed.compareAndSet(false, true)) {
                source.cancel();
                subscriber.onError(error);
            }
        }
    }
}
