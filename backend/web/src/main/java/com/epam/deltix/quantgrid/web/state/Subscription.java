package com.epam.deltix.quantgrid.web.state;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import org.epam.deltix.proto.Api;

import java.util.Map;

@Getter
@EqualsAndHashCode
public class Subscription {
    private final String projectName;
    // tableName, viewport
    private final Map<String, Api.Viewport> viewports;

    public Subscription(String projectName, Map<String, Api.Viewport> viewports) {
        this.projectName = projectName;
        this.viewports = viewports;
    }

    public Subscription(String projectName) {
        this(projectName, Map.of());
    }
}
