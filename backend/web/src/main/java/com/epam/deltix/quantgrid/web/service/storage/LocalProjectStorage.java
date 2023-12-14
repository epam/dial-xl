package com.epam.deltix.quantgrid.web.service.storage;

import com.epam.deltix.quantgrid.web.exception.NotFoundException;
import com.epam.deltix.quantgrid.web.model.WorksheetState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

@Slf4j
public class LocalProjectStorage implements ProjectStorage {

    private static final String WORKSHEET_EXTENSION = ".qg";

    private final Path projectsFolder;

    public LocalProjectStorage(Path projectsFolder) {
        this.projectsFolder = projectsFolder;
        try {
            Files.createDirectories(projectsFolder);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to create a projects folder", e);
        }
    }

    @Override
    public List<String> getAllProjectNames() {
        try (Stream<Path> paths = Files.list(projectsFolder)) {
            return paths.filter(Files::isDirectory)
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to get all project names", e);
        }
    }

    @Override
    public List<Worksheet> loadWorksheets(String projectName) {
        Path projectFolder = projectsFolder.resolve(projectName);
        validateProjectFolder(projectFolder);

        List<Worksheet> worksheets = new ArrayList<>();
        try (Stream<Path> paths = Files.list(projectFolder)) {
            Path[] worksheetPaths = paths.filter(p -> p.toString().endsWith(WORKSHEET_EXTENSION)).toArray(Path[]::new);
            for (Path worksheetPath : worksheetPaths) {
                String worksheetFileName = worksheetPath.getFileName().toString();
                String worksheetName =
                        worksheetFileName.substring(0, worksheetFileName.length() - WORKSHEET_EXTENSION.length());

                String dsl = Files.readString(worksheetPath);
                worksheets.add(new Worksheet(worksheetName, dsl));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load project worksheets", e);
        }

        return worksheets;
    }

    @Override
    public void saveWorksheets(String projectName, List<WorksheetState> worksheetStates) {
        log.info("Saving project {}", projectName);
        Path projectFolder = projectsFolder.resolve(projectName);
        try {
            Files.createDirectories(projectFolder);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to create a folder for project" + projectName, e);
        }
        worksheetStates.forEach(worksheet -> saveWorksheet(projectFolder, worksheet));
    }

    @Override
    public void renameProject(String oldProjectName, String newProjectName) {
        try {
            Files.move(projectsFolder.resolve(oldProjectName), projectsFolder.resolve(newProjectName));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to rename project " + oldProjectName + " to " + newProjectName, e);
        }
    }

    @Override
    public void deleteProject(String projectName) {
        Path projectFolder = projectsFolder.resolve(projectName);
        validateProjectFolder(projectFolder);
        try {
            FileSystemUtils.deleteRecursively(projectFolder);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete project " + projectName, e);
        }
    }

    @Override
    public void saveWorksheet(String projectName, WorksheetState worksheetState) {
        Path projectFolder = projectsFolder.resolve(projectName);
        validateProjectFolder(projectFolder);

        saveWorksheet(projectFolder, worksheetState);
    }

    @Override
    public void deleteWorksheet(String projectName, String worksheetName) {
        Path projectFolder = projectsFolder.resolve(projectName);
        validateProjectFolder(projectFolder);

        try {
            Files.delete(projectFolder.resolve(worksheetName + WORKSHEET_EXTENSION));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete worksheet " + projectName + "/" + worksheetName, e);
        }
    }


    @Override
    public void renameWorksheet(String projectName, String oldWorksheetName, String newWorksheetName) {
        Path projectFolder = projectsFolder.resolve(projectName);
        validateProjectFolder(projectFolder);

        String oldWorksheetFileName = oldWorksheetName + WORKSHEET_EXTENSION;
        String newWorksheetFileName = newWorksheetName + WORKSHEET_EXTENSION;
        try {
            Files.move(projectFolder.resolve(oldWorksheetFileName), projectFolder.resolve(newWorksheetFileName));
        } catch (IOException e) {
            throw new UncheckedIOException(
                    "Failed to rename worksheet " + oldWorksheetFileName + " to " + newWorksheetFileName + "in project "
                            + projectName, e);
        }
    }

    private void saveWorksheet(Path projectFolder, WorksheetState worksheet) {
        String worksheetFileName = worksheet.getSheetName() + WORKSHEET_EXTENSION;
        Path worksheetPath = projectFolder.resolve(worksheetFileName);
        try {
            Files.writeString(worksheetPath, worksheet.getDsl(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write worksheet " + worksheetFileName, e);
        }
    }

    private static void validateProjectFolder(Path path) {
        String projectName = path.getFileName().toString();
        if (!Files.exists(path)) {
            throw new NotFoundException("Project " + projectName + " does not exist");
        }
        if (!Files.isDirectory(path)) {
            throw new IllegalArgumentException(projectName + " expected to be a directory");
        }
    }
}
