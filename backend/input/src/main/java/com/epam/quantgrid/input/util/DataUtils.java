package com.epam.quantgrid.input.util;

import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

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
}