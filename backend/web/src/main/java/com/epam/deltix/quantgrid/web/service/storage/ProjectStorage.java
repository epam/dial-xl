package com.epam.deltix.quantgrid.web.service.storage;

import com.epam.deltix.quantgrid.web.model.WorksheetState;

import java.util.List;

public interface ProjectStorage {

    /**
     * @return all project names available in storage.
     */
    List<String> getAllProjectNames();

    /**
     * Loads project data from storage.
     *
     * @param projectName string project name
     * @return a list of worksheets associated with this project
     */
    List<Worksheet> loadWorksheets(String projectName);

    /**
     * Save project state into the storage.
     *
     * @param projectName string project name
     * @param worksheetStates list of worksheets associated with this project
     */
    void saveWorksheets(String projectName, List<WorksheetState> worksheetStates);

    void renameProject(String oldProjectName, String newProjectName);

    void deleteProject(String projectName);

    void saveWorksheet(String projectName, WorksheetState worksheetState);

    void deleteWorksheet(String projectName, String worksheetName);

    void renameWorksheet(String projectName, String oldWorksheetName, String newWorksheetName);

}
