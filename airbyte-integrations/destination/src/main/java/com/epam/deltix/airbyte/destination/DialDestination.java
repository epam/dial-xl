package com.epam.deltix.airbyte.destination;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.univocity.parsers.csv.CsvWriter;
import com.univocity.parsers.csv.CsvWriterSettings;
import okhttp3.Call;
import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DialDestination {
    private static final int MAX_COLUMNS = 100_000;
    private static final String TRUE_VALUE = String.valueOf(Double.doubleToRawLongBits(1));
    private static final String FALSE_VALUE = String.valueOf(Double.doubleToRawLongBits(0));
    private static final String NULL_DOUBLE_VALUE = String.valueOf(0x7ff8000000000001L);
    private static final String NULL_STRING_VALUE = null;
    private static final MediaType TEXT_CSV = MediaType.parse("text/csv; charset=utf-8");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String URL_FIELD = "url";
    private static final String HEADER_NAME_FIELD = "header_name";
    private static final String HEADER_VALUE_FIELD = "header_value";
    private static final Charset CHARSET = StandardCharsets.UTF_8;
    private static final Duration CONNECT_TIMEOUT = getEnvDuration("DIAL_CONNECT_TIMEOUT_MS", Duration.ofSeconds(15));
    private static final Duration WRITE_TIMEOUT = getEnvDuration("DIAL_WRITE_TIMEOUT_MS", Duration.ofMinutes(1));

    private final OkHttpClient httpClient;

    public DialDestination() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(CONNECT_TIMEOUT)
                .writeTimeout(WRITE_TIMEOUT)
                .build();
    }

    public static void main(String[] args) throws Exception {
        try {
            new DialDestination().run(args);
            // Couldn't find a better way to force exit after async HTTP calls
            // and avoid waiting 1 minute for OkHttp Dispatcher to shut down.
            System.exit(0);
        } catch (SourceError e) {
            System.out.println(e.getLine());
            System.exit(1);
        } catch (Exception e) {
            String type = e instanceof IllegalArgumentException ? "config_error" : "system_error";
            System.out.println(errorTraceMessage(e, type));
            System.exit(1);
        }
    }

    private void run(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException(
                    "Usage: DialDestination <spec|check|write> [--config <path>] [--catalog <path>]");
        }

        String cmd = args[0];
        Map<String, String> flags = parseFlags(args);
        DialDestination app = new DialDestination();

        switch (cmd) {
            case "spec" -> app.runSpec();
            case "check" -> {
                String configPath = flags.get("--config");
                if (StringUtils.isBlank(configPath)) {
                    throw new IllegalArgumentException("Missing --config for check");
                }
                JsonNode config = readJsonFile(configPath);
                app.runCheck(config);
            }
            case "write" -> {
                String configPath = flags.get("--config");
                if (StringUtils.isBlank(configPath)) {
                    throw new IllegalArgumentException("Missing --config for write");
                }
                String catalogPath = flags.get("--catalog");
                if (StringUtils.isBlank(catalogPath)) {
                    throw new IllegalArgumentException("Missing --catalog for write");
                }
                JsonNode config = readJsonFile(configPath);
                JsonNode catalog = readJsonFile(catalogPath);
                app.runWrite(config, catalog);
            }
            default -> throw new IllegalArgumentException("Unknown command: " + cmd);
        }
    }

    private static Map<String, String> parseFlags(String[] args) {
        Map<String, String> out = new HashMap<>();
        for (int i = 1; i < args.length - 1; i++) {
            if (args[i].startsWith("--")) {
                String old = out.put(args[i], args[i + 1]);
                if (old != null) {
                    throw new IllegalArgumentException("Duplicate flag: " + args[i]);
                }
                i++;
            } else {
                throw new IllegalArgumentException("Unexpected argument: " + args[i]);
            }
        }
        return out;
    }

    private static JsonNode readJsonFile(String path) throws IOException {
        try (InputStream stream = new FileInputStream(path)) {
            return MAPPER.readTree(stream);
        }
    }

    private void runSpec() throws IOException {
        try (InputStream stream = DialDestination.class.getClassLoader().getResourceAsStream("spec.json")) {
            ObjectNode specNode = MAPPER.createObjectNode();
            specNode.put("type", "SPEC");
            ObjectNode specPayload = specNode.putObject("spec");
            specPayload.set("connectionSpecification", MAPPER.readTree(stream));
            ArrayNode supportedDestinationSyncModes = specPayload.putArray("supported_destination_sync_modes");
            supportedDestinationSyncModes.add("overwrite");

            System.out.println(MAPPER.writeValueAsString(specNode));
        }
    }

    private void runCheck(JsonNode config) throws IOException {
        ObjectNode result = MAPPER.createObjectNode();
        result.put("type", "CONNECTION_STATUS");
        ObjectNode status = result.putObject("connectionStatus");

        try {
            HttpUrl url = getUrl(config);
            Request request = new Request.Builder()
                    .url(url)
                    .get()
                    .headers(buildAuthHeaders(config))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() && response.code() != 404) {
                    status.put("status", "FAILED");
                    status.put("message", response.message());
                    System.out.println(MAPPER.writeValueAsString(result));
                    return;
                }
            }

            status.put("status", "SUCCEEDED");
            System.out.println(MAPPER.writeValueAsString(result));
        } catch (Exception e) {
            status.put("status", "FAILED");
            status.put("message", e.getMessage());
            System.out.println(MAPPER.writeValueAsString(result));
        }
    }

    private void runWrite(JsonNode config, JsonNode catalog) throws Exception {
        HttpUrl url = getUrl(config);
        Headers authHeaders = buildAuthHeaders(config);

        JsonNode streams = catalog.path("streams");
        if (!streams.isArray()) {
            throw new IllegalArgumentException("catalog.streams must be an array");
        }

        if (streams.size() > 1) {
            throw new IllegalArgumentException("Only one stream is supported");
        }

        JsonNode stream = streams.get(0).path("stream");
        String name = stream.path("name").asText();
        if (StringUtils.isBlank(name)) {
            throw new IllegalArgumentException("streams.stream.name is required");
        }
        JsonNode jsonSchema = stream.get("json_schema");
        LinkedHashMap<String, String> schema = extractSchema(jsonSchema);

        StreamingRequestBody body = new StreamingRequestBody(TEXT_CSV, 1 << 16);

        MultipartBody multipart = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", "file.csv", body)
                .build();

        Request request = new Request.Builder()
                .url(url)
                .put(multipart)
                .headers(authHeaders)
                .build();

        Call call = httpClient.newCall(request);
        UploadCallback callback = new UploadCallback();
        call.enqueue(callback);
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, CHARSET));
             OutputStream outputStream = body.outputStream()) {
            CsvWriterSettings settings = createCsvWriterSettings(schema);
            CsvWriter writer = new CsvWriter(outputStream, settings);
            writer.writeHeaders(schema.keySet());

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                JsonNode message = MAPPER.readTree(line);
                String type = message.path("type").asText();

                if ("RECORD".equals(type)) {
                    JsonNode record = message.path("record");
                    String streamName = record.path("stream").asText();
                    if (!name.equals(streamName)) {
                        throw new IllegalArgumentException("Received RECORD for unknown stream: " + streamName);
                    }
                    JsonNode data = record.path("data");
                    List<String> row = new ArrayList<>(schema.size());
                    for (String column : schema.keySet()) {
                        JsonNode value = data == null ? NullNode.getInstance() : data.path(column);
                        row.add(serialize(value, schema.get(column)));
                    }
                    writer.writeRow(row);
                } else if ("STATE".equals(type)) {
                    writer.flush();
                    System.out.println(line);
                } else if ("LOG".equals(type)) {
                    JsonNode log = message.path("log");
                    if ("ERROR".equals(log.path("level").asText())) {
                        String error = log.path("message").asText();
                        throw new SourceError(error, line);
                    }
                } else if ("TRACE".equals(type)) {
                    JsonNode trace = message.path("trace");
                    if ("ERROR".equals(trace.path("type").asText())) {
                        JsonNode error = trace.path("error");
                        throw new SourceError(error.path("message").asText(), line);
                    }
                } else {
                    // ignore
                }
            }
        } catch (Exception e) {
            call.cancel();
            throw e;
        }
        callback.await();
    }

    private CsvWriterSettings createCsvWriterSettings(LinkedHashMap<String, String> schema) {
        CsvWriterSettings settings = new CsvWriterSettings();
        settings.setMaxColumns(MAX_COLUMNS);
        settings.setMaxCharsPerColumn(-1);
        List<Integer> quoteIndices = new ArrayList<>();
        int index = 0;
        for (String column : schema.keySet()) {
            String type = schema.get(column);
            if (!type.equals("number") && !type.equals("boolean")) {
                quoteIndices.add(index);
            }

            index++;
        }
        settings.quoteIndexes(quoteIndices.toArray(Integer[]::new));
        settings.setQuoteNulls(false); // to differentiate between null and empty string
        settings.setSkipEmptyLines(false);

        return settings;
    }

    private static LinkedHashMap<String, String> extractSchema(JsonNode schemaNode) {
        LinkedHashMap<String, String> schema = new LinkedHashMap<>();
        if (schemaNode != null && schemaNode.has("properties") && schemaNode.get("properties").isObject()) {
            ObjectNode props = (ObjectNode) schemaNode.get("properties");
            Iterator<String> it = props.fieldNames();
            while (it.hasNext()) {
                String name = it.next();
                String type = resolveType(props.path(name).path("type"));
                schema.put(name, type);
            }
        }
        return schema;
    }

    private static String resolveType(JsonNode type) {
        if (type.isTextual()) {
            return type.asText();
        }

        if (type.isArray()) {
            if (type.isEmpty()) {
                return "string";
            }

            for (JsonNode item : type) {
                if (!"null".equals(item.asText())) {
                    return item.asText();
                }
            }

            return type.get(0).asText();
        }

        throw new IllegalArgumentException("Invalid type node: " + type);
    }

    private static String serialize(JsonNode value, String type) {
        return switch (type) {
            case "number": {
                if (value.isNull()) {
                    yield NULL_DOUBLE_VALUE;
                }
                if (!value.isNumber()) {
                    throw new IllegalArgumentException("Expected number, got: " + value);
                }
                yield String.valueOf(Double.doubleToRawLongBits(value.doubleValue()));
            }
            case "boolean": {
                if (value.isNull()) {
                    yield NULL_DOUBLE_VALUE;
                }
                if (!value.isBoolean()) {
                    throw new IllegalArgumentException("Expected boolean, got: " + value);
                }
                yield value.booleanValue() ? TRUE_VALUE : FALSE_VALUE;
            }
            default:
                if (value.isNull()) {
                    yield NULL_STRING_VALUE;
                }
                if (value.isTextual()) {
                    yield value.asText();
                } else {
                    yield value.toString();
                }
        };
    }

    private HttpUrl getUrl(JsonNode config) {
        if (!config.hasNonNull(URL_FIELD)) {
            throw new IllegalArgumentException("Missing base_url");
        }
        HttpUrl base = HttpUrl.parse(config.get(URL_FIELD).asText());
        if (base == null) {
            throw new IllegalArgumentException("base_url is not a valid URL");
        }
        return base;
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

    private static String errorTraceMessage(Exception exception, String type) throws IOException {
        ObjectNode message = MAPPER.createObjectNode();
        message.put("type", "TRACE");
        ObjectNode traceNode = message.putObject("trace");
        traceNode.put("type", "ERROR");
        traceNode.put("emitted_at", System.currentTimeMillis());
        ObjectNode errorNode = traceNode.putObject("error");
        errorNode.put("message", exception.getMessage());
        errorNode.put("internal_message", exception.getMessage());
        errorNode.put("stack_trace", ExceptionUtils.getStackTrace(exception));
        errorNode.put("failure_type", type);
        return MAPPER.writeValueAsString(message);
    }

    private static Duration getEnvDuration(String name, Duration defaultValue) {
        String value = System.getenv(name);
        return StringUtils.isBlank(value) ? defaultValue : Duration.parse(value);
    }
}