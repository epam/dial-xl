package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

import java.util.List;


public interface InputMetadata {
    String path();
    String etag();
    String identifier();
    List<String> names();
    List<InputColumnType> types();
}
