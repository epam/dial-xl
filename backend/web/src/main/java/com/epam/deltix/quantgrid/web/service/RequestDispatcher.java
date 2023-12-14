package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.compiler.function.Argument;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.service.InputMetadataCache;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.web.model.WorksheetState;
import com.epam.deltix.quantgrid.web.service.storage.InputStorage;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.epam.deltix.quantgrid.web.state.Subscription;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.google.protobuf.MessageOrBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestDispatcher {

    private static final Api.Pong PONG = Api.Pong.newBuilder().build();

    private final ProjectManager projectManager;
    private final InputStorage inputStorage;
    private final SubscriptionManager subscriptionManager;
    private final EventSender eventSender;
    private final InputMetadataCache inputMetadataCache;

    public Api.Response route(String sessionId, Api.Request request) throws Exception {
        Api.Response.Builder responseBuilder = Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId(request.getId());

        Api.Request.RequestCase requestType = request.getRequestCase();
        switch (requestType) {
            case PROJECT_LIST_REQUEST -> {
                Api.ProjectList projectList = handleAllProjectRequest();
                responseBuilder.setProjectList(projectList);
            }
            case CREATE_PROJECT_REQUEST -> {
                Api.ProjectState newProjectState = handleCreateProjectRequest(request.getCreateProjectRequest());
                responseBuilder.setProjectState(newProjectState);

                // subscribe user for project events, no lock required
                subscriptionManager.subscribe(sessionId, new Subscription(newProjectState.getProjectName()));

                // notify all clients except this one
                sendProjectStateEvent(newProjectState, sessionId);
            }
            case OPEN_PROJECT_REQUEST -> {
                Api.ProjectState openedProjectState =
                        handleOpenProjectRequest(sessionId, request.getOpenProjectRequest());
                responseBuilder.setProjectState(openedProjectState);
            }
            case RENAME_PROJECT_REQUEST -> {
                Api.RenameProjectResponse renamedProjectState =
                        handleRenameProjectRequest(request.getRenameProjectRequest());
                responseBuilder.setRenameProjectResponse(renamedProjectState);

                // notify all clients except this one
                sendProjectRenameEvent(renamedProjectState, sessionId);
            }
            case CLOSE_PROJECT_REQUEST -> {
                Api.ProjectState closedProjectState =
                        handleCloseProjectRequest(sessionId, request.getCloseProjectRequest());
                responseBuilder.setProjectState(closedProjectState);
            }
            case DELETE_PROJECT_REQUEST -> {
                Api.ProjectState deletedProjectState = handleDeleteProjectRequest(request.getDeleteProjectRequest());
                responseBuilder.setProjectState(deletedProjectState);

                // notify all clients except this one
                sendProjectStateEvent(deletedProjectState, sessionId);
            }
            case OPEN_WORKSHEET_REQUEST -> {
                Api.WorksheetState worksheetState = handleOpenWorksheetRequest(request.getOpenWorksheetRequest());
                responseBuilder.setWorksheetState(worksheetState);
            }
            case PUT_WORKSHEET_REQUEST -> {
                Api.WorksheetState updatedWorksheet = handlePutWorksheetRequest(request.getPutWorksheetRequest());
                responseBuilder.setWorksheetState(updatedWorksheet);

                // notify subscribed clients except this one
                sendWorksheetStateEvent(updatedWorksheet, sessionId);
            }
            case CLOSE_WORKSHEET_REQUEST -> {
                Api.WorksheetState closedWorksheet =
                        handleCloseWorksheetRequest(sessionId, request.getCloseWorksheetRequest());
                responseBuilder.setWorksheetState(closedWorksheet);
            }
            case RENAME_WORKSHEET_REQUEST -> {
                Api.RenameWorksheetResponse renameWorksheetResponse = handleRenameWorksheetRequest(
                        request.getRenameWorksheetRequest());
                responseBuilder.setRenameWorksheetResponse(renameWorksheetResponse);

                // notify subscribed clients except this one
                sendWorksheetRenameEvent(renameWorksheetResponse, sessionId);
            }
            case DELETE_WORKSHEET_REQUEST -> {
                Api.WorksheetState deletedWorksheet = handleDeleteWorksheetRequest(request.getDeleteWorksheetRequest());
                responseBuilder.setWorksheetState(deletedWorksheet);

                // notify subscribed clients except this one
                sendWorksheetStateEvent(deletedWorksheet, sessionId);
            }
            case VIEWPORT_REQUEST -> {
                Api.ViewportState viewportState = handleViewportRequest(sessionId, request.getViewportRequest());
                responseBuilder.setViewportState(viewportState);
            }
            case INPUT_LIST_REQUEST -> {
                Api.InputList inputList = inputStorage.getInputList();
                responseBuilder.setInputList(inputList);
            }
            case PING -> {
                responseBuilder
                        .clearId()
                        .clearStatus()
                        .setPong(PONG);
            }
            case INPUT_METADATA_REQUEST -> {
                Api.InputMetadataResponse inputMetadataResponse =
                        handleInputMetadataRequest(request.getInputMetadataRequest());
                responseBuilder.setInputMetadataResponse(inputMetadataResponse);
            }
            case DIMENSIONAL_SCHEMA_REQUEST -> {
                Api.DimensionalSchemaResponse dimensionSchemaResponse =
                        handleDimensionalSchemaRequest(request.getDimensionalSchemaRequest());
                responseBuilder.setDimensionalSchemaResponse(dimensionSchemaResponse);
            }
            case FUNCTION_REQUEST -> {
                Api.FunctionResponse functionResponse = handleFunctionRequest(request.getFunctionRequest());
                responseBuilder.setFunctionResponse(functionResponse);
            }
            default -> throw new UnsupportedOperationException("Unsupported request type: " + requestType);
        }

        return responseBuilder.build();
    }

    private Api.ProjectList handleAllProjectRequest() {
        Set<String> allProjects = projectManager.getAllProjectNames();
        return ApiMessageMapper.toProjectList(allProjects);
    }

    private Api.ProjectState handleCreateProjectRequest(Api.CreateProjectRequest request) {
        String projectName = request.getProjectName();
        ProjectContext project = projectManager.create(projectName);
        return ApiMessageMapper.toProjectState(project, false);
    }

    private Api.ProjectState handleOpenProjectRequest(String sessionId, Api.OpenProjectRequest request)
            throws Exception {
        String projectName = request.getProjectName();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            subscriptionManager.subscribe(sessionId, new Subscription(projectName));
            return ApiMessageMapper.toProjectState(project, false);
        });
    }

    private Api.RenameProjectResponse handleRenameProjectRequest(Api.RenameProjectRequest request) throws Exception {
        String projectName = request.getProjectName();
        long version = request.getVersion();
        String newProjectName = request.getNewProjectName();

        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            ProjectContext renamedProject = projectManager.rename(project, newProjectName, version);
            subscriptionManager.remapProjectName(projectName, newProjectName);
            // change subscriptions
            return Api.RenameProjectResponse.newBuilder()
                    .setNewProjectName(newProjectName)
                    .setOldProjectName(projectName)
                    .setVersion(renamedProject.getVersion())
                    .build();
        });
    }

    private Api.ProjectState handleCloseProjectRequest(String sessionId, Api.CloseProjectRequest request)
            throws Exception {
        String projectName = request.getProjectName();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            // unsubscribe client from project updates
            subscriptionManager.unsubscribe(sessionId);
            // trigger calculation after viewport change
            project.calculate();
            return ApiMessageMapper.toProjectState(project, false);
        });
    }

    private Api.ProjectState handleDeleteProjectRequest(Api.DeleteProjectRequest request) throws Exception {
        String projectName = request.getProjectName();
        long version = request.getVersion();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            ProjectContext context = projectManager.delete(projectName, version);
            // since project deleted successfully - unsubscribe all users from this project
            subscriptionManager.unsubscribeFromProject(projectName);
            // trigger calculation with empty viewports -> cancel running calculations
            context.calculate();
            return ApiMessageMapper.toProjectState(context, true);
        });
    }

    private Api.WorksheetState handleOpenWorksheetRequest(Api.OpenWorksheetRequest request) throws Exception {
        String projectName = request.getProjectName();
        String worksheetName = request.getSheetName();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            WorksheetState worksheet = project.getWorksheet(worksheetName);
            project.calculate();
            return ApiMessageMapper.toWorksheetState(projectName, project.getVersion(), worksheet,
                    project.getCompilationErrors(), false);
        });
    }

    private Api.WorksheetState handlePutWorksheetRequest(Api.PutWorksheetRequest request) throws Exception {
        long version = request.getVersion();
        String worksheetName = request.getSheetName();
        String projectName = request.getProjectName();
        String dsl = request.getContent();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            WorksheetState worksheet = project.updateWorksheet(worksheetName, version, dsl);
            return ApiMessageMapper.toWorksheetState(projectName, project.getVersion(), worksheet,
                    project.getCompilationErrors(), false);
        });
    }

    private Api.WorksheetState handleCloseWorksheetRequest(String sessionId, Api.CloseWorksheetRequest request)
            throws Exception {
        String worksheetName = request.getSheetName();
        String projectName = request.getProjectName();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            // dop viewport subscription if any
            subscriptionManager.subscribe(sessionId, new Subscription(projectName));
            // trigger calculation after viewport change
            project.calculate();
            WorksheetState worksheet = project.getWorksheet(worksheetName);
            return ApiMessageMapper.toWorksheetState(projectName, project.getVersion(), worksheet,
                    project.getCompilationErrors(), false);
        });
    }

    private Api.RenameWorksheetResponse handleRenameWorksheetRequest(Api.RenameWorksheetRequest request)
            throws Exception {
        long version = request.getVersion();
        String projectName = request.getProjectName();
        String newWorksheetName = request.getNewSheetName();
        String oldWorksheetName = request.getOldSheetName();

        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            project.renameWorksheet(oldWorksheetName, newWorksheetName, version);
            return Api.RenameWorksheetResponse.newBuilder()
                    .setVersion(project.getVersion())
                    .setProjectName(projectName)
                    .setNewSheetName(newWorksheetName)
                    .setOldSheetName(oldWorksheetName)
                    .build();
        });
    }

    private Api.WorksheetState handleDeleteWorksheetRequest(Api.DeleteWorksheetRequest request) throws Exception {
        long version = request.getVersion();
        String projectName = request.getProjectName();
        String worksheetName = request.getSheetName();

        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            WorksheetState worksheet = project.removeWorksheet(worksheetName, version);
            project.calculate();
            return ApiMessageMapper.toWorksheetState(projectName, project.getVersion(), worksheet, Map.of(), true);
        });
    }

    private Api.ViewportState handleViewportRequest(String sessionId, Api.ViewportRequest request) throws Exception {
        String projectName = request.getProjectName();
        Map<String, Api.Viewport> viewportMapping = request.getViewportsMap();
        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            Subscription subscription = new Subscription(projectName, viewportMapping);
            Subscription previous = subscriptionManager.subscribe(sessionId, subscription);

            if (!subscription.equals(previous)) {
                project.calculate();
            }

            return ApiMessageMapper.toViewportState();
        });
    }

    private Api.InputMetadataResponse handleInputMetadataRequest(Api.InputMetadataRequest request) {
        Api.InputFile inputFile = request.getInput();
        String subFolder = String.join("/", inputFile.getPathsList());

        InputMetadata metadata =
                inputMetadataCache.getInputMetadata(String.join("/", subFolder, inputFile.getInputName()));

        return ApiMessageMapper.toInputMetadataResponse(inputFile, metadata);
    }

    private Api.DimensionalSchemaResponse handleDimensionalSchemaRequest(Api.DimensionalSchemaRequest request)
            throws Exception {
        String projectName = request.getProjectName();
        String textFormula = request.getFormula();

        ProjectContext project = projectManager.get(projectName);
        return underProjectLock(project, () -> {
            projectManager.checkIfNotDeleted(projectName);
            return project.getFormulaSchema(textFormula);
        });
    }

    private Api.FunctionResponse handleFunctionRequest(Api.FunctionRequest request) {
        Api.FunctionResponse.Builder response = Api.FunctionResponse.newBuilder();

        for (Function function : Functions.functions()) {
            Api.Function.Builder builder = Api.Function.newBuilder()
                    .setName(function.name())
                    .setDescription(function.description());

            for (Argument argument : function.arguments()) {
                Api.Argument arg = Api.Argument.newBuilder()
                        .setName(argument.name())
                        .setDescription(argument.description())
                        .setRepeatable(argument.repeatable())
                        .setOptional(argument.optional())
                        .build();

                builder.addArguments(arg);
            }

            response.addFunctions(builder);
        }

        return response.build();
    }

    private <T extends MessageOrBuilder> T underProjectLock(ProjectContext project, Callable<T> action)
            throws Exception {
        synchronized (project) {
            return action.call();
        }
    }

    // TODO async send
    private void sendProjectStateEvent(Api.ProjectState state, String currentSessionId) {
        Api.Response projectEvent = Api.Response.newBuilder().setProjectState(state).build();
        eventSender.sendEventToAllSessions(projectEvent, currentSessionId);
    }

    // TODO async send
    private void sendProjectRenameEvent(Api.RenameProjectResponse state, String currentSessionId) {
        Api.Response projectEvent = Api.Response.newBuilder().setRenameProjectResponse(state).build();
        eventSender.sendEventToAllSessions(projectEvent, currentSessionId);
    }

    // TODO async send
    private void sendWorksheetStateEvent(Api.WorksheetState state, String currentSessionId) {
        Api.Response worksheetEvent = Api.Response.newBuilder().setWorksheetState(state).build();
        eventSender.sendEventToAllProjectSubscribers(worksheetEvent, state.getProjectName(), currentSessionId);
    }

    // TODO async send
    private void sendWorksheetRenameEvent(Api.RenameWorksheetResponse state, String currentSessionId) {
        Api.Response worksheetEvent = Api.Response.newBuilder().setRenameWorksheetResponse(state).build();
        eventSender.sendEventToAllProjectSubscribers(worksheetEvent, state.getProjectName(), currentSessionId);
    }
}
