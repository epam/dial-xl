package com.epam.deltix.quantgrid.web.service.project;

import org.yaml.snakeyaml.Yaml;

import java.util.LinkedHashMap;
import java.util.Map;

public record Project(Map<String, String> sheets) {
    public static Project fromYaml(String yaml) {
        Map<String, Object> map = new Yaml().load(yaml);
        Map<String, String> sheets = new LinkedHashMap<>();

        map.forEach((key, value) -> {
            if (!key.startsWith("/") && value instanceof String v) {
                sheets.put(key, v);
            }
        });

        return new Project(sheets);
    }
}