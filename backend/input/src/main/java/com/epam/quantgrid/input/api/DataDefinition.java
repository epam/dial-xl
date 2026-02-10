package com.epam.quantgrid.input.api;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Data;

import java.util.LinkedHashMap;

@Data
public class DataDefinition {

    private String id;
    private String title;
    private LinkedHashMap<String, Setting> settings = new LinkedHashMap<>();

    public String toJson() {
        JsonNodeFactory factory = JsonNodeFactory.instance;
        ObjectNode structure = new ObjectNode(factory);
        structure.put("$shema", "https://json-schema.org/draft/2020-12/schema");
        structure.put("title", title);
        structure.put("type", "object");

        ObjectNode properties = structure.putObject("properties");
        for (Setting setting : settings.values()) {
            ObjectNode property = properties.putObject(setting.getName());
            property.put("type", "string");
            property.put("title", setting.getTitle());
            property.put("description", setting.getDescription());

            if (setting.isWriteOnly()) {
                property.put("writeOnly", true);
            }
        }

        ArrayNode required = structure.putArray("required");
        for (Setting settings : settings.values()) {
            if (settings.isRequired()) {
                required.add(settings.getName());
            }
        }

        return structure.toPrettyString();
    }

    @Data
    public static class Setting {
        private String name;
        private Class<?> type;
        private String title;
        private String description;
        private int order;
        private boolean required;
        private boolean writeOnly;
    }
}