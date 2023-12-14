package com.epam.deltix.quantgrid.web.utils;

import lombok.experimental.UtilityClass;
import org.springframework.util.FileSystemUtils;

import java.io.File;
import java.nio.file.Path;

@UtilityClass
public class LocalStorageUtils {

    public void cleanDirectory(Path directory) {
        File projectsFolder = directory.toFile();
        FileSystemUtils.deleteRecursively(projectsFolder);
        projectsFolder.mkdirs();
    }
}
