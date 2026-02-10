package com.epam.quantgrid.input.api;

public interface DataStream extends AutoCloseable {

    DataRow next() throws Exception;

    @Override
    void close();
}