package com.epam.quantgrid.input.api;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;

public interface DataInput {

    DataCatalog getCatalog(String token) throws Exception;

    DataSchema getSchema(String dataset) throws Exception;

    DataStream getStream(String dataset, DataSchema schema) throws Exception;

}