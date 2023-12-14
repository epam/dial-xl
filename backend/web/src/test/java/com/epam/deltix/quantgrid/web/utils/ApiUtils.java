package com.epam.deltix.quantgrid.web.utils;

import lombok.experimental.UtilityClass;
import org.epam.deltix.proto.Api;

@UtilityClass
public class ApiUtils {

    public Api.Request getProjectListRequest(String correlationId) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setProjectListRequest(Api.ProjectListRequest.newBuilder().build())
                .build();
    }

    public Api.Request createProjectRequest(String correlationId, String projectName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setCreateProjectRequest(Api.CreateProjectRequest.newBuilder().setProjectName(projectName).build())
                .build();
    }

    public Api.Request putWorksheetRequest(String correlationId, String projectName, long version,
                                           String sheetName, String dsl) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setPutWorksheetRequest(Api.PutWorksheetRequest.newBuilder()
                        .setVersion(version)
                        .setContent(dsl)
                        .setSheetName(sheetName)
                        .setProjectName(projectName)
                        .build())
                .build();
    }

    public Api.Request renameProjectRequest(String correlationId, String projectName, long version,
                                            String newProjectName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setRenameProjectRequest(Api.RenameProjectRequest.newBuilder()
                        .setProjectName(projectName)
                        .setVersion(version)
                        .setNewProjectName(newProjectName)
                        .build())
                .build();
    }

    public Api.Request renameWorksheetRequest(String correlationId, String projectName, long version,
                                              String oldSheetName, String newSheetName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setRenameWorksheetRequest(Api.RenameWorksheetRequest.newBuilder()
                        .setProjectName(projectName)
                        .setVersion(version)
                        .setNewSheetName(newSheetName)
                        .setOldSheetName(oldSheetName)
                        .build())
                .build();
    }

    public Api.Request deleteProjectRequest(String correlationId, String projectName, long version) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setDeleteProjectRequest(Api.DeleteProjectRequest.newBuilder()
                        .setProjectName(projectName)
                        .setVersion(version)
                        .build())
                .build();
    }

    public Api.Request deleteWorksheetRequest(String correlationId, String projectName, long version,
                                              String sheetName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setDeleteWorksheetRequest(Api.DeleteWorksheetRequest.newBuilder()
                        .setProjectName(projectName)
                        .setSheetName(sheetName)
                        .setVersion(version)
                        .build())
                .build();
    }

    public Api.Request openProjectRequest(String correlationId, String projectName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setOpenProjectRequest(Api.OpenProjectRequest.newBuilder().setProjectName(projectName).build())
                .build();
    }

    public Api.Request closeProjectRequest(String correlationId, String projectName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setCloseProjectRequest(Api.CloseProjectRequest.newBuilder().setProjectName(projectName).build())
                .build();
    }

    public Api.Request openWorksheetRequest(String correlationId, String projectName, String sheetName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setOpenWorksheetRequest(Api.OpenWorksheetRequest.newBuilder()
                        .setProjectName(projectName)
                        .setSheetName(sheetName)
                        .build())
                .build();
    }

    public Api.Request closeWorksheetRequest(String correlationId, String projectName, String sheetName) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setOpenWorksheetRequest(Api.OpenWorksheetRequest.newBuilder()
                        .setProjectName(projectName)
                        .setSheetName(sheetName)
                        .build())
                .build();
    }

    public Api.Request getSchemaRequest(String correlationId, String projectName, String formula) {
        return Api.Request.newBuilder()
                .setId(correlationId)
                .setDimensionalSchemaRequest(
                        Api.DimensionalSchemaRequest.newBuilder()
                                .setFormula(formula)
                                .setProjectName(projectName)
                                .build())
                .build();
    }

}
