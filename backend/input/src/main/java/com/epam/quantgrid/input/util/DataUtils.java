package com.epam.quantgrid.input.util;

import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;

@Slf4j
@UtilityClass
public class DataUtils {

    private final JsonMapper MAPPER = new JsonMapper();

    @SneakyThrows
    public <T> T fromJson(String json, Class<T> type) {
        return MAPPER.readValue(json, type);
    }

    @SneakyThrows
    public void close(AutoCloseable... resources) {
        closer(resources).close();
    }

    public AutoCloseable closer(AutoCloseable... resources) {
        return () -> {
            for (AutoCloseable resource : resources) {
                if (resource != null) {
                    try {
                        resource.close();
                    } catch (Throwable e) {
                        log.warn("Failed to close resource: {}", resource, e);
                    }
                }
            }
        };
    }

    public String selectColumns(String dataset, Collection<String> columns) {
        String table = Arrays.stream(dataset.split("/"))
                .map(DataUtils::escapeIdentifier)
                .collect(Collectors.joining("."));
        String names = columns.stream()
                .map(DataUtils::escapeIdentifier)
                .collect(Collectors.joining(","));

        return "select %s from %s".formatted(names, table);
    }

    private String escapeIdentifier(String name) {
        return "\"" + name.replace("\"", "\"\"") + "\"";
    }
}