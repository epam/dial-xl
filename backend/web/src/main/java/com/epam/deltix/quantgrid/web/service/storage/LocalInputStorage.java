package com.epam.deltix.quantgrid.web.service.storage;

import org.epam.deltix.proto.Api;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

public class LocalInputStorage implements InputStorage {

    private static final String CSV_EXTENSION = ".csv";
    private static final String[] SUPPORTED_EXTENSIONS = new String[] {CSV_EXTENSION};

    private final Path inputsFolder;

    // number of names(folders) from root till inputsFolder
    private final int subFoldersNumber;

    public LocalInputStorage(Path inputsFolder) {
        this.inputsFolder = inputsFolder;
        this.subFoldersNumber = inputsFolder.getNameCount();
        try {
            Files.createDirectories(inputsFolder);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to create a inputs folder", e);
        }
    }

    @Override
    public Api.InputList getInputList() {
        List<Api.InputFile> inputFiles = getInputFiles(inputsFolder);
        return Api.InputList.newBuilder()
                .addAllInputs(inputFiles)
                .build();
    }

    private List<Api.InputFile> getInputFiles(Path directory) {
        List<Api.InputFile> inputs = new ArrayList<>();
        try (Stream<Path> paths = Files.list(directory)) {
            paths.forEach(path -> {
                if (Files.isDirectory(path)) {
                    inputs.addAll(getInputFiles(path));
                } else {
                    addSupportedInputs(path, inputs);
                }
            });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return inputs;
    }

    private void addSupportedInputs(Path file, List<Api.InputFile> resultInputList) {
        String fileName = file.getFileName().toString();
        for (String extension : SUPPORTED_EXTENSIONS) {
            if (fileName.endsWith(extension)) {
                Api.InputFile.Builder inputFileBuilder = Api.InputFile.newBuilder()
                        .setInputName(fileName);

                // if input file is not in an inputs folder root - add subdirectories
                if (file.getNameCount() - subFoldersNumber > 1) {
                    Path subPath = file.subpath(subFoldersNumber, file.getParent().getNameCount());

                    subPath.iterator()
                            .forEachRemaining(p -> inputFileBuilder.addPaths(p.toString()));
                }

                resultInputList.add(inputFileBuilder.build());
                break;
            }
        }
    }
}
