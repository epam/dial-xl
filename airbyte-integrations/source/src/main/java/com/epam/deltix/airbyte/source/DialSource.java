package com.epam.deltix.airbyte.source;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;

import java.io.BufferedWriter;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DialSource {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final CSVFormat CSV_FORMAT = CSVFormat.RFC4180;

    private static final String STREAM_NAME_FIELD = "stream_name";
    private static final String URL_FIELD = "url";
    private static final String HEADER_NAME_FIELD = "header_name";
    private static final String HEADER_VALUE_FIELD = "header_value";
    private static final Duration CONNECT_TIMEOUT = getEnvDuration("DIAL_SOURCE_CONNECT_TIMEOUT_MS", Duration.ofSeconds(15));
    private static final Duration READ_TIMEOUT = getEnvDuration("DIAL_SOURCE_READ_TIMEOUT_MS", Duration.ofMinutes(1));

    private final OkHttpClient httpClient;

    public DialSource() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(CONNECT_TIMEOUT)
                .readTimeout(READ_TIMEOUT)
                .build();
    }

    public static void main(String[] args) {
        try {
            new DialSource().run(args);
        } catch (Exception e) {
            emitErrorTrace(e.getMessage());
        }
    }

    private void run(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException("Usage: DialSource <spec|discover|read> [--config <path>] [--catalog <path>]");
        }

        String cmd = args[0];
        Map<String, String> flags = parseFlags(args);

        DialSource app = new DialSource();

        switch (cmd) {
            case "spec" -> app.runSpec();
            case "discover" -> {
                String configPath = flags.get("--config");
                if (configPath == null) {
                    throw new IllegalArgumentException("Missing --config for discover");
                }
                JsonNode config = readJsonFile(configPath);
                app.runDiscover(config);
            }
            case "read" -> {
                String configPath = flags.get("--config");
                String catalogPath = flags.get("--catalog");
                if (configPath == null || catalogPath == null) {
                    throw new IllegalArgumentException("Missing --config or --catalog for read");
                }
                JsonNode config = readJsonFile(configPath);
                JsonNode catalog = readJsonFile(catalogPath);
                app.runRead(config, catalog, System.out);
            }
            default -> throw new IllegalArgumentException("Unknown command: " + cmd);
        }
    }

    private static Map<String, String> parseFlags(String[] args) {
        Map<String, String> out = new HashMap<>();
        for (int i = 1; i < args.length - 1; i++) {
            if (args[i].startsWith("--")) {
                out.put(args[i], args[i + 1]);
                i++;
            } else {
                throw new IllegalArgumentException("Unexpected argument: " + args[i]);
            }
        }
        return out;
    }

    private static JsonNode readJsonFile(String path) throws IOException {
        try (InputStream is = new FileInputStream(path)) {
            return MAPPER.readTree(is);
        }
    }

    private void runSpec() throws IOException {
        try (InputStream stream = DialSource.class.getClassLoader().getResourceAsStream("spec.json")) {
            ObjectNode specNode = MAPPER.createObjectNode();
            specNode.put("type", "SPEC");
            ObjectNode specPayload = specNode.putObject("spec");
            specPayload.set("connectionSpecification", MAPPER.readTree(stream));
            ArrayNode supportedSyncModes = specPayload.putArray("supported_sync_modes");
            supportedSyncModes.add("full_refresh");

            System.out.println(MAPPER.writeValueAsString(specNode));
        }
    }

    private void runDiscover(JsonNode config) throws IOException {
        HttpUrl url = getUrl(config);
        String streamName = getStreamName(config);
        Headers authHeaders = buildAuthHeaders(config);

        Request req = new Request.Builder()
                .url(url)
                .get()
                .headers(authHeaders)
                .build();

        List<String> headers;
        Map<String, String> inferredTypes = new LinkedHashMap<>();

        try (Response resp = httpClient.newCall(req).execute()) {
            if (!resp.isSuccessful()) {
                throw new IOException("Failed to fetch " + url + ": " + resp.message());
            }

            try (InputStream body = resp.body().byteStream();
                 Reader reader = new InputStreamReader(body, StandardCharsets.UTF_8);
                 CSVParser parser = CSV_FORMAT
                         .withFirstRecordAsHeader()
                         .parse(reader)) {

                headers = new ArrayList<>(parser.getHeaderMap().keySet());

                for (CSVRecord record : parser) {
                    for (String header : headers) {
                        String value = record.get(header);
                        String currentType = inferredTypes.get(header);
                        String newType = inferType(value, currentType);
                        inferredTypes.put(header, newType);
                    }
                }
            }
        }

        ObjectNode result = MAPPER.createObjectNode();
        result.put("type", "CATALOG");
        ObjectNode catalog = result.putObject("catalog");
        ArrayNode streams = catalog.putArray("streams");

        ObjectNode stream = MAPPER.createObjectNode();
        stream.put("name", streamName);
        ArrayNode syncModes = stream.putArray("supported_sync_modes");
        syncModes.add("full_refresh");

        ObjectNode jsonSchema = stream.putObject("json_schema");
        ObjectNode props = jsonSchema.putObject("properties");
        for (Map.Entry<String, String> e : inferredTypes.entrySet()) {
            props.putObject(e.getKey()).put("type", e.getValue());
        }

        streams.add(stream);

        System.out.println(MAPPER.writeValueAsString(result));
    }

    private static String inferType(String value, String type) {
        if (value == null || value.isEmpty() || "string".equals(type)) {
            return "string";
        }
        if ((type == null || "number".equals(type)) && NumberUtils.isParsable(value)) {
            return "number";
        }
        if ((type == null || "boolean".equals(type))
                && (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false"))) {
            return "boolean";
        }
        return "string";
    }

    private void runRead(JsonNode config, JsonNode catalog, OutputStream stdout) throws IOException {
        HttpUrl url = getUrl(config);
        String streamName = getStreamName(config);
        Headers authHeaders = buildAuthHeaders(config);

        JsonNode streams = catalog.path("streams");
        if (!streams.isArray()) {
            throw new IllegalArgumentException("catalog.streams must be an array");
        }
        if (streams.isEmpty()) {
            throw new IllegalArgumentException("catalog.streams must not be empty");
        }
        if (streams.size() > 1) {
            throw new IllegalArgumentException("Only one stream is supported");
        }
        JsonNode stream = streams.get(0).path("stream");
        if (!streamName.equals(stream.path("name").asText())) {
            throw new IllegalArgumentException("Stream name in catalog does not match config");
        }
        JsonNode properties = stream.path("json_schema").path("properties");
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(stdout, StandardCharsets.UTF_8))) {
            Request request = new Request.Builder()
                    .url(url)
                    .get()
                    .headers(authHeaders)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new IOException("Failed to fetch " + url + ": " + response.message());
                }

                try (InputStream body = response.body().byteStream();
                     Reader reader = new InputStreamReader(body, StandardCharsets.UTF_8);
                     CSVParser parser = CSV_FORMAT
                             .withFirstRecordAsHeader()
                             .parse(reader)) {

                    for (CSVRecord line : parser) {
                        ObjectNode message = MAPPER.createObjectNode();
                        message.put("type", "RECORD");
                        ObjectNode record = message.putObject("record");
                        record.put("stream", streamName);
                        ObjectNode data = record.putObject("data");

                        properties.fieldNames().forEachRemaining(
                                name -> data.put(name, line.get(name)));
                        writer.write(MAPPER.writeValueAsString(message));
                        writer.write("\n");
                    }
                }
            }

            ObjectNode state = MAPPER.createObjectNode();
            state.put("type", "STATE");
            state.putObject("state").put("last_read", System.currentTimeMillis());
            writer.write(MAPPER.writeValueAsString(state));
            writer.write("\n");
            writer.flush();
        }
    }

    private HttpUrl getUrl(JsonNode config) {
        if (!config.hasNonNull(URL_FIELD)) {
            throw new IllegalArgumentException("Missing url");
        }
        HttpUrl base = HttpUrl.parse(config.get(URL_FIELD).asText());
        if (base == null) {
            throw new IllegalArgumentException("url is not a valid URL");
        }
        return base;
    }

    private String getStreamName(JsonNode config) {
        if (!config.hasNonNull(STREAM_NAME_FIELD)) {
            throw new IllegalArgumentException("Missing stream_name");
        }
        return config.get(STREAM_NAME_FIELD).asText();
    }

    private Headers buildAuthHeaders(JsonNode config) {
        if (!config.has(HEADER_NAME_FIELD)) {
            throw new IllegalArgumentException("Missing header_name");
        }
        if (!config.has(HEADER_VALUE_FIELD)) {
            throw new IllegalArgumentException("Missing header_value");
        }
        return new Headers.Builder()
                .add(config.get(HEADER_NAME_FIELD).asText(), config.get(HEADER_VALUE_FIELD).asText())
                .build();
    }

    private static void emitErrorTrace(String message) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode traceMsg = mapper.createObjectNode();
        traceMsg.put("type", "TRACE");
        ObjectNode trace = traceMsg.putObject("trace");
        trace.put("type", "ERROR");
        ObjectNode error = trace.putObject("error");
        error.put("message", message);
        try {
            System.out.println(mapper.writeValueAsString(traceMsg));
        } catch (Exception ignored) {}
    }

    private static Duration getEnvDuration(String name, Duration defaultValue) {
        String value = System.getenv(name);
        return StringUtils.isBlank(value) ? defaultValue : Duration.parse(value);
    }
}