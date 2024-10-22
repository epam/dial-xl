package com.epam.deltix.quantgrid.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpMessage;
import org.apache.http.StatusLine;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
public class DialFileApi implements AutoCloseable {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final CloseableHttpClient httpClient;
    private final URI baseUriV1;

    public DialFileApi(String baseUri) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(15000)
                .setSocketTimeout(15000)
                .setConnectionRequestTimeout(15000)
                .build();

        this.httpClient = HttpClients.custom()
                .setDefaultRequestConfig(requestConfig)
                .setMaxConnTotal(256)
                .setMaxConnPerRoute(256)
                .setConnectionTimeToLive(10, TimeUnit.MINUTES)
                .evictExpiredConnections()
                .evictIdleConnections(5, TimeUnit.MINUTES)
                .build();

        this.baseUriV1 = URI.create(baseUri).resolve("/v1/");
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

    public void writeFile(String path, byte[] bytes, String contentType, Principal principal)
            throws IOException {
        HttpPut httpPut = new HttpPut(baseUriV1.resolve(path));
        setAuthorizationHeader(httpPut, principal);

        MultipartEntityBuilder entityBuilder = MultipartEntityBuilder.create();
        entityBuilder.addBinaryBody("file", bytes, ContentType.getByMimeType(contentType), "file.txt");
        httpPut.setEntity(entityBuilder.build());

        try (CloseableHttpResponse response = httpClient.execute(httpPut);
             InputStream ignore = response.getEntity().getContent()) {

            StatusLine statusLine = response.getStatusLine();
            if (statusLine.getStatusCode() != 200) {
                throw new IOException(
                        "Failed to upload file to %s: %s".formatted(path, statusLine.getReasonPhrase()));
            }
        }
    }

    public Attributes getAttributes(String path, Principal principal) {
        try {
            Map<String, Object> metadata = readDict("metadata/" + path + "?permissions=true", principal);
            String etag = (String) metadata.get("etag");
            @SuppressWarnings("unchecked")
            List<String> permissions = (List<String>) metadata.getOrDefault("permissions", List.of());
            return new Attributes(etag, permissions);
        } catch (IOException e) {
            log.error("Cannot check file permissions: {}", path, e);
            return Attributes.EMPTY;
        }
    }

    private Map<String, Object> readDict(String path, Principal principal) throws IOException {
        try (EtaggedStream stream = readFile(path, principal)) {
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

    public record Attributes(String etag, List<String> permissions) {
        public static final Attributes EMPTY = new Attributes(null, List.of());
    }
}
