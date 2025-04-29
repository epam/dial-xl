package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jetbrains.annotations.Nullable;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
@NoArgsConstructor
public class Schema {
    public static final int SCHEMA_VERSION = 1;
    @JsonIgnore
    private final Map<String, Object> unknownProperties = new LinkedHashMap<>();
    private int version;
    private long timestamp;
    @Nullable
    private LinkedHashMap<String, ColumnType> columns;
    private String etag;
    @Nullable
    private String error;

    public Schema(LinkedHashMap<String, ColumnType> columns, String etag) {
        this.version = SCHEMA_VERSION;
        this.timestamp = System.currentTimeMillis();
        this.columns = columns;
        this.etag = etag;
    }

    public Schema(String error, String etag) {
        this.version = SCHEMA_VERSION;
        this.timestamp = System.currentTimeMillis();
        this.error = error;
        this.etag = etag;
    }

    @JsonAnySetter
    public void setUnknownProperties(String key, String value) {
        unknownProperties.put(key, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }
}
