package com.epam.deltix.quantgrid.engine.service.ai;

import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;

@UtilityClass
public class AiUtil {
    static final JsonMapper MAPPER = JsonMapper.builder()
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    public String sanitize(String text) {
        text = StringUtils.strip(text, " \n\r\t");

        if (text.startsWith("```json") && text.endsWith("```")) {
            text = text.substring(7, text.length() - 3);
            text = StringUtils.strip(text, " \n\r\t");
        }

        return text;
    }

    @SneakyThrows
    public String toJsonMap(Map<String, String> map) {
        return MAPPER.writeValueAsString(map);
    }

    @SneakyThrows
    public Map<String, String> fromJsonMap(String json) {
        try {
            return MAPPER.readValue(json, new TypeReference<Map<String, String>>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON: " + json, e);
        }
    }

    @SneakyThrows
    public String toJsonArray(StringColumn column) {
        String[] array = column.toArray();
        return toJsonArray(array);
    }

    @SneakyThrows
    public String toJsonArray(String[] array) {
        return MAPPER.writeValueAsString(array);
    }

    @SneakyThrows
    public StringColumn fromJsonArray(String json) {
        try {
            String[] array = MAPPER.readValue(json, String[].class);
            return new StringDirectColumn(array);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON: " + json, e);
        }
    }
}