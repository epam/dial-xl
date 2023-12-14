package com.epam.deltix.quantgrid.web.service.storage;

import com.epam.deltix.quantgrid.web.model.WorksheetState;
import com.epam.deltix.quantgrid.web.utils.LocalStorageUtils;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

class TestLocalProjectStorage {

    private static final Path testDir = Path.of("build/storage/projects");

    private static final LocalProjectStorage projectStorage = new LocalProjectStorage(testDir);

    @BeforeEach
    void cleanUp() {
        LocalStorageUtils.cleanDirectory(testDir);
    }

    @Test
    void testGetAllProjectNames() {
        projectStorage.saveWorksheets("Project1", List.of());
        projectStorage.saveWorksheets("Project2", List.of());

        List<String> allProjectNames = projectStorage.getAllProjectNames();

        MatcherAssert.assertThat(allProjectNames, Matchers.containsInAnyOrder("Project1", "Project2"));
    }

    @Test
    void testSaveProject() {
        List<String> emptyProjectNames = projectStorage.getAllProjectNames();
        MatcherAssert.assertThat(emptyProjectNames, Matchers.empty());

        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL", null)));

        List<String> allProjectNames = projectStorage.getAllProjectNames();
        MatcherAssert.assertThat(allProjectNames, Matchers.containsInAnyOrder("Project1"));
    }

    @Test
    void testLoadProject() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null),
                new WorksheetState("Sheet2", "DSL2", null)));

        List<Worksheet> worksheets = projectStorage.loadWorksheets("Project1");
        MatcherAssert.assertThat(worksheets, Matchers.containsInAnyOrder(
                new Worksheet("Sheet1", "DSL1"),
                new Worksheet("Sheet2", "DSL2")));
    }

    @Test
    void testRenameProject() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null),
                new WorksheetState("Sheet2", "DSL2", null)));
        projectStorage.renameProject("Project1", "Project2");

        List<Worksheet> worksheets = projectStorage.loadWorksheets("Project2");
        MatcherAssert.assertThat(worksheets, Matchers.containsInAnyOrder(
                new Worksheet("Sheet1", "DSL1"),
                new Worksheet("Sheet2", "DSL2")));
    }

    @Test
    void testDeleteProject() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null),
                new WorksheetState("Sheet2", "DSL2", null)));
        projectStorage.deleteProject("Project1");

        List<String> project = projectStorage.getAllProjectNames();
        MatcherAssert.assertThat(project, Matchers.empty());
    }

    @Test
    void testSaveWorksheet() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null)));
        projectStorage.saveWorksheet("Project1", new WorksheetState("Sheet1", "DSL2", null));

        List<Worksheet> worksheets = projectStorage.loadWorksheets("Project1");
        MatcherAssert.assertThat(worksheets, Matchers.is(List.of(
                new Worksheet("Sheet1", "DSL2"))));
    }

    @Test
    void testRenameWorksheet() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null)));
        projectStorage.renameWorksheet("Project1", "Sheet1", "Sheet2");

        List<Worksheet> worksheets = projectStorage.loadWorksheets("Project1");
        MatcherAssert.assertThat(worksheets, Matchers.is(List.of(
                new Worksheet("Sheet2", "DSL1"))));
    }

    @Test
    void testDeleteWorksheet() {
        projectStorage.saveWorksheets("Project1", List.of(new WorksheetState("Sheet1", "DSL1", null)));
        projectStorage.deleteWorksheet("Project1", "Sheet1");

        List<Worksheet> worksheets = projectStorage.loadWorksheets("Project1");
        MatcherAssert.assertThat(worksheets, Matchers.empty());
    }

}
