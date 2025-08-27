package com.epam.deltix.quantgrid.util;

import java.io.IOException;
import java.io.OutputStream;

public interface BodyWriter {
    void write(OutputStream out) throws IOException;
}