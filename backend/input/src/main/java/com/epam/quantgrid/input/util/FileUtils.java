package com.epam.quantgrid.input.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class FileUtils {
    public boolean isCsv(String path) {
        return path.toLowerCase().endsWith(".csv");
    }
}
