package com.epam.deltix.quantgrid.web.utils;

import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

@UtilityClass
public class JsonUtils {

    private final JsonMapper MAPPER = new JsonMapper();

    @SneakyThrows
    public <T> T fromString(String string, Class<T> type) {
        return MAPPER.readValue(string, type);
    }

    @SneakyThrows
    public String toString(Object object) {
        return MAPPER.writeValueAsString(object);
    }
}