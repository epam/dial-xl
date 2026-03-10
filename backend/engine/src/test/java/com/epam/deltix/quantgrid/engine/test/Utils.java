package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.util.EtaggedStream;
import lombok.experimental.UtilityClass;

import java.io.IOException;
import java.io.InputStream;

@UtilityClass
public class Utils {
    public EtaggedStream resourceStream(String etag, String resourceName) throws IOException {
        InputStream stream = Utils.class.getClassLoader().getResource(resourceName).openStream();
        return new EtaggedStream(stream, stream, etag);
    }
}
