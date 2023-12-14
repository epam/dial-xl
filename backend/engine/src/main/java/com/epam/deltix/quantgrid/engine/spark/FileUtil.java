package com.epam.deltix.quantgrid.engine.spark;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.Nullable;

import java.io.Closeable;
import java.io.IOException;

@Slf4j
@UtilityClass
public class FileUtil {

    public static void close(Closeable @Nullable [] resources) {
        if (resources != null) {
            for (Closeable resource : resources) {
                close(resource);
            }
        }
    }

    public static void close(@Nullable Closeable closeable) {
        if (closeable != null) {
            try {
                closeable.close();
            } catch (IOException e) {
                log.error("Could not close resource", e);
            }
        }
    }
}
