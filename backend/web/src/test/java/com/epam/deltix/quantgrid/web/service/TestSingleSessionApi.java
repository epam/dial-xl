package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.epam.deltix.quantgrid.web.utils.ApiUtils;
import com.epam.deltix.quantgrid.web.utils.LocalStorageUtils;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import jakarta.websocket.WebSocketContainer;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.tomcat.websocket.WsWebSocketContainer;
import org.epam.deltix.proto.Api;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.WebSocketClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import static com.epam.deltix.quantgrid.web.utils.WebSocketUtils.toTextMessage;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TestSingleSessionApi {

    @LocalServerPort
    private Integer serverPort;

    @Autowired
    private ProjectManager projectManager;

    @Autowired
    private SubscriptionManager subscriptionManager;

    @Value("${web.storage.local.projectsFolder}")
    private String projectsFolder;

    private WebSocketSession wsSession;
    private SingleClientMessageHandler singleClientMessageHandler;

    @BeforeEach
    public void init() {
        // clean projects folder
        LocalStorageUtils.cleanDirectory(Path.of(projectsFolder));
        // invalidate caches
        projectManager.invalidateAll();
        subscriptionManager.invalidateAll();
        WebSocketContainer webSocketContainer = new WsWebSocketContainer();
        webSocketContainer.setDefaultMaxTextMessageBufferSize(16 * 1024 * 1024);
        WebSocketClient webSocketClient = new StandardWebSocketClient(webSocketContainer);
        singleClientMessageHandler = new SingleClientMessageHandler();
        try {
            wsSession = webSocketClient.execute(singleClientMessageHandler,
                    new WebSocketHttpHeaders(), URI.create(String.format("ws://localhost:%s/ws", serverPort))).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testCreateProject() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(3);

        Api.Request allProjectRequest = ApiUtils.getProjectListRequest("testId1");
        wsSession.sendMessage(toTextMessage(allProjectRequest));

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId2", "Project1");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId3", "Project1", 1, "Sheet1", "TEXT DSL");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(3);
        // ProjectList response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectList(Api.ProjectList.newBuilder().build())
                .build());

        // CreateProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId2")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(1)
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED).setId("testId3")
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setContent("TEXT DSL")
                        .setVersion(2)
                        .setIsDeleted(false)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("mismatched input 'TEXT' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build());


        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testInputDimensionalSchema() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(3);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project1");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project1", 1, "Sheet1", "");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request formulaSchemaRequest =
                ApiUtils.getSchemaRequest("testId3", "Project1", "INPUT(\"countries/country.csv\").FILTER(1)");
        wsSession.sendMessage(toTextMessage(formulaSchemaRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(3);

        // CreateProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(1)
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED).setId("testId2")
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setContent("")
                        .setVersion(2)
                        .setIsDeleted(false)
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId3")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("INPUT(\"countries/country.csv\").FILTER(1)")
                        .addAllSchema(List.of("Country", "City", "Population"))
                        .build())
                .build());

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testFormulaDimensionalSchema() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(9);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project1");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project1", 1, "Sheet1", """
                table t1
                key dim [c] = RANGE(5)
                    key [a] = 5
                    [b] = 7
                     
                table t2
                dim [a] = RANGE(3)
                    [b] = t1.FILTER([a] > $[a])
                """);
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request inputDimensionalSchema =
                ApiUtils.getSchemaRequest("testId3", "Project1", "INPUT(\"countries/country.csv\").FILTER(1)");
        wsSession.sendMessage(toTextMessage(inputDimensionalSchema));

        Api.Request nestedTableDimensionalSchema =
                ApiUtils.getSchemaRequest("testId4", "Project1", "t2[b]");
        wsSession.sendMessage(toTextMessage(nestedTableDimensionalSchema));

        Api.Request filteredNestedTableDimensionalSchema =
                ApiUtils.getSchemaRequest("testId5", "Project1", "t2[b].FILTER($[c] > 5)");
        wsSession.sendMessage(toTextMessage(filteredNestedTableDimensionalSchema));

        Api.Request nestedColumnDimensionalSchema =
                ApiUtils.getSchemaRequest("testId6", "Project1", "t2[a]");
        wsSession.sendMessage(toTextMessage(nestedColumnDimensionalSchema));

        Api.Request invalidDimensionalSchema =
                ApiUtils.getSchemaRequest("testId7", "Project1", "5");
        wsSession.sendMessage(toTextMessage(invalidDimensionalSchema));

        Api.Request tableReferenceDimensionalSchema =
                ApiUtils.getSchemaRequest("testId8", "Project1", "t2.DISTINCTBY($[a])");
        wsSession.sendMessage(toTextMessage(tableReferenceDimensionalSchema));

        Api.Request rangeDimensionalSchema =
                ApiUtils.getSchemaRequest("testId9", "Project1", "RANGE(10)");
        wsSession.sendMessage(toTextMessage(rangeDimensionalSchema));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(9);

        // CreateProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(1)
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED).setId("testId2")
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setContent("""
                                table t1
                                key dim [c] = RANGE(5)
                                    key [a] = 5
                                    [b] = 7
                                     
                                table t2
                                dim [a] = RANGE(3)
                                    [b] = t1.FILTER([a] > $[a])
                                """)
                        .setVersion(2)
                        .setIsDeleted(false)
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId3")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("INPUT(\"countries/country.csv\").FILTER(1)")
                        .addAllSchema(List.of("Country", "City", "Population"))
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId4")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("t2[b]")
                        .addAllSchema(List.of("c", "a", "b"))
                        .addAllKeys(List.of("c", "a"))
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId5")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("t2[b].FILTER($[c] > 5)")
                        .addAllSchema(List.of("c", "a", "b"))
                        .addAllKeys(List.of("c", "a"))
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId6")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("t2[a]")
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId7")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("5")
                        .setErrorMessage("Impossible to get dimensional schema for formula: 5")
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId8")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("t2.DISTINCTBY($[a])")
                        .addAllSchema(List.of("a", "b"))
                        .build())
                .build());

        // DimensionalSchema response
        expectedResponses.add(Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId9")
                .setDimensionalSchemaResponse(Api.DimensionalSchemaResponse.newBuilder()
                        .setProjectName("Project1")
                        .setFormula("RANGE(10)")
                        .build())
                .build());

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testProjectAndWorksheetRename() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(5);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project1");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project1", 1, "Sheet1", "");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request renameProjectRequest = ApiUtils.renameProjectRequest("testId3", "Project1", 2, "Project2");
        wsSession.sendMessage(toTextMessage(renameProjectRequest));

        Api.Request renameWorksheetRequest =
                ApiUtils.renameWorksheetRequest("testId4", "Project2", 3, "Sheet1", "Sheet2");
        wsSession.sendMessage(toTextMessage(renameWorksheetRequest));

        Api.Request putWorksheetRequest2 = ApiUtils.putWorksheetRequest("testId5", "Project2", 4, "Sheet2", "USER DSL");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest2));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(5);

        // CreateProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setVersion(1)
                        .setProjectName("Project1")
                        .setIsDeleted(false)
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId2")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(2)
                        .setSheetName("Sheet1")
                        .setContent("")
                        .setIsDeleted(false)
                        .build())
                .build());

        // RenameProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId3")
                .setStatus(Api.Status.SUCCEED)
                .setRenameProjectResponse(Api.RenameProjectResponse.newBuilder()
                        .setVersion(3)
                        .setOldProjectName("Project1")
                        .setNewProjectName("Project2")
                        .build())
                .build());

        // RenameWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId4")
                .setStatus(Api.Status.SUCCEED)
                .setRenameWorksheetResponse(Api.RenameWorksheetResponse.newBuilder()
                        .setProjectName("Project2")
                        .setVersion(4)
                        .setOldSheetName("Sheet1")
                        .setNewSheetName("Sheet2")
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId5")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project2")
                        .setVersion(5)
                        .setSheetName("Sheet2")
                        .setContent("USER DSL")
                        .setIsDeleted(false)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("mismatched input 'USER' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build());

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testProjectAndWorksheetDelete() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(4);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project1");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project1", 1, "Sheet1", "");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request deleteSheetRequest = ApiUtils.deleteWorksheetRequest("testId3", "Project1", 2, "Sheet1");
        wsSession.sendMessage(toTextMessage(deleteSheetRequest));

        Api.Request deleteProjectRequest = ApiUtils.deleteProjectRequest("testId4", "Project1", 3);
        wsSession.sendMessage(toTextMessage(deleteProjectRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(4);

        // CreateProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setVersion(1)
                        .setProjectName("Project1")
                        .setIsDeleted(false)
                        .build())
                .build());

        // PutWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId2")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(2)
                        .setSheetName("Sheet1")
                        .setContent("")
                        .setIsDeleted(false)
                        .build())
                .build());

        // DeleteWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId3")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(3)
                        .setSheetName("Sheet1")
                        .setIsDeleted(true)
                        .build())
                .build());

        // DeleteProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId4")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(4)
                        .setProjectName("Project1")
                        .setIsDeleted(true)
                        .build())
                .build());

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testOpenAndCloseProject() throws Exception {
        ProjectContext project = projectManager.create("Project1");
        project.updateWorksheet("Sheet1", 1, "DSL");

        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(4);

        Api.Request openProjectRequest = ApiUtils.openProjectRequest("testId1", "Project1");
        wsSession.sendMessage(toTextMessage(openProjectRequest));

        Api.Request openSheetRequest = ApiUtils.openWorksheetRequest("testId2", "Project1", "Sheet1");
        wsSession.sendMessage(toTextMessage(openSheetRequest));

        Api.Request closeWorksheetRequest = ApiUtils.closeWorksheetRequest("testId3", "Project1", "Sheet1");
        wsSession.sendMessage(toTextMessage(closeWorksheetRequest));

        Api.Request closeProjectRequest = ApiUtils.closeProjectRequest("testId4", "Project1");
        wsSession.sendMessage(toTextMessage(closeProjectRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> expectedResponses = new ArrayList<>(4);

        // OpenProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setVersion(2)
                        .addSheets(Api.WorksheetState.newBuilder()
                                .setContent("DSL")
                                .setVersion(2)
                                .setSheetName("Sheet1")
                                .setIsDeleted(false)
                                .setProjectName("Project1")
                                .addParsingErrors(Api.ParsingError.newBuilder()
                                        .setLine(1)
                                        .setPosition(0)
                                        .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                        .build())
                                .build())
                        .setProjectName("Project1")
                        .setIsDeleted(false)
                        .build())
                .build());

        // OpenWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId2")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(2)
                        .setSheetName("Sheet1")
                        .setContent("DSL")
                        .setIsDeleted(false)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build());

        // CloseWorksheet response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId3")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setVersion(2)
                        .setContent("DSL")
                        .setSheetName("Sheet1")
                        .setIsDeleted(false)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build());

        // CloseProject response
        expectedResponses.add(Api.Response.newBuilder()
                .setId("testId4")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setVersion(2)
                        .addSheets(Api.WorksheetState.newBuilder()
                                .setContent("DSL")
                                .setVersion(2)
                                .setSheetName("Sheet1")
                                .setIsDeleted(false)
                                .setProjectName("Project1")
                                .addParsingErrors(Api.ParsingError.newBuilder()
                                        .setLine(1)
                                        .setPosition(0)
                                        .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                        .build())
                                .build())
                        .setProjectName("Project1")
                        .setIsDeleted(false)
                        .build())
                .build());

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    @Test
    void testInvalidProtocolRequest() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(1);

        wsSession.sendMessage(new TextMessage("Hello"));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        Api.Response errorResponse = Api.Response.newBuilder()
                .setStatus(Api.Status.INVALID_PROTOCOL)
                .setErrorMessage("Expect message object but got: \"Hello\"")
                .build();

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(1, actualResponses.size());

        Assertions.assertEquals(errorResponse, actualResponses.get(0));
    }

    @Test
    void testProjectNotFound() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(1);

        Api.Request openProjectRequest = ApiUtils.openProjectRequest("testId1", "TestProject");
        wsSession.sendMessage(toTextMessage(openProjectRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        Api.Response errorResponse = Api.Response.newBuilder()
                .setStatus(Api.Status.NOT_FOUND)
                .setId("testId1")
                .setErrorMessage("Project TestProject not found")
                .build();

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(1, actualResponses.size());

        Assertions.assertEquals(errorResponse, actualResponses.get(0));
    }

    @Test
    void testVersionConflict() throws Exception {
        ProjectContext project = projectManager.create("Project1");
        project.updateWorksheet("Sheet1", 1, "DSL");

        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(1);

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId1", "Project1", 1, "Sheet1", "DSL2");
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        Api.Response errorResponse = Api.Response.newBuilder()
                .setStatus(Api.Status.VERSION_CONFLICT)
                .setId("testId1")
                .setErrorMessage("Provided project version 1 does not match actual version 2")
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setVersion(2)
                        .setContent("DSL")
                        .setIsDeleted(false)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build();

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(1, actualResponses.size());

        Assertions.assertEquals(errorResponse, actualResponses.get(0));
    }

    @Test
    void testColumnDataEvents() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        // expected responses: ProjectState + WorksheetState + ViewportState + 4 * ColumnData
        singleClientMessageHandler.setExpectedResponses(8);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project", 1, "Sheet1",
                """
                        table t1
                            dim [a] = RANGE(5)
                                [b] = [a] + 7
                                [c] = [a] + [b]
                                [f] = t1.FILTER([a] < $[a]).COUNT()
                                [ps] = t1.FILTER([a] < $[a]).PERIODSERIES($[b], $[c], "DAY")
                        """);
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request viewportRequest = Api.Request.newBuilder()
                .setId("testId3")
                .setViewportRequest(Api.ViewportRequest.newBuilder()
                        .setProjectName("Project")
                        .putViewports("t1", Api.Viewport.newBuilder()
                                .addFields("a")
                                .addFields("b")
                                .addFields("c")
                                .addFields("f")
                                .addFields("ps")
                                .setIsContent(true)
                                .setStartRow(0)
                                .setEndRow(100)
                                .build())
                        .build())
                .build();
        wsSession.sendMessage(toTextMessage(viewportRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(8, actualResponses.size());

        List<Api.Response> columnDataEvents = actualResponses.stream()
                .filter(response -> response.getResponseCase() == Api.Response.ResponseCase.COLUMN_DATA)
                .toList();
        Assertions.assertEquals(5, columnDataEvents.size());

        List<Api.Response> expectedColumnDataEvents = List.of(
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("a")
                                .setTableName("t1")
                                .addAllData(List.of("0", "1", "2", "3", "4"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.INTEGER)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("b")
                                .setTableName("t1")
                                .addAllData(List.of("7.0", "8.0", "9.0", "10.0", "11.0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.DOUBLE)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("c")
                                .setTableName("t1")
                                .addAllData(List.of("7.0", "9.0", "11.0", "13.0", "15.0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.DOUBLE)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("f")
                                .setTableName("t1")
                                .addAllData(List.of("4", "3", "2", "1", "0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.INTEGER)
                                .build())
                        .build(),
                jsonResponse("""
                             {
                               "status": "SUCCEED",
                               "columnData": {
                                 "tableName": "t1",
                                 "columnName": "ps",
                                 "version": "2",
                                 "isPending": false,
                                 "data": ["4", "3", "2", "1", "N/A"],
                                 "startRow": "0",
                                 "endRow": "100",
                                 "type": "PERIOD_SERIES",
                                 "isNested": false,
                                 "periodSeries": [{
                                   "points": {
                                     "1900-01-08": "9.0",
                                     "1900-01-09": "11.0",
                                     "1900-01-10": "13.0",
                                     "1900-01-11": "15.0"
                                   }
                                 }, {
                                   "points": {
                                     "1900-01-09": "11.0",
                                     "1900-01-10": "13.0",
                                     "1900-01-11": "15.0"
                                   }
                                 }, {
                                   "points": {
                                     "1900-01-10": "13.0",
                                     "1900-01-11": "15.0"
                                   }
                                 }, {
                                   "points": {
                                     "1900-01-11": "15.0"
                                   }
                                 }, {
                                   "points": {
                                   }
                                 }]
                               }
                             }
                        """)
        );

        MatcherAssert.assertThat(columnDataEvents,
                Matchers.containsInAnyOrder(expectedColumnDataEvents.toArray()));
    }

    @Test
    void testDynamicColumnEvents() throws Exception {
        // add expected responses count, used in ClientMessageHandler to complete a future task
        // expected responses: ProjectState + WorksheetState + ViewportState + 4 * ColumnData
        singleClientMessageHandler.setExpectedResponses(7);

        Api.Request createProjectRequest = ApiUtils.createProjectRequest("testId1", "Project");
        wsSession.sendMessage(toTextMessage(createProjectRequest));

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId2", "Project", 1, "Sheet1",
                """
                        !manual()
                        table A
                           [country] = NA
                           [population] = NA
                        override
                        [country], [population]
                        "USA", 10
                        "UK", 20
                        "Spain", 30
                        "USA", 40
                                         
                        table B
                           [*] = A.PIVOT($[country], SUM($[population]))
                        """);
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Request viewportRequest = Api.Request.newBuilder()
                .setId("testId3")
                .setViewportRequest(Api.ViewportRequest.newBuilder()
                        .setProjectName("Project")
                        .putViewports("B", Api.Viewport.newBuilder()
                                .addFields("*")
                                .addFields("USA")
                                .addFields("UK")
                                .addFields("Spain")
                                .setStartRow(0)
                                .setEndRow(100)
                                .build())
                        .build())
                .build();
        wsSession.sendMessage(toTextMessage(viewportRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(7, actualResponses.size());

        List<Api.Response> columnDataEvents = actualResponses.stream()
                .filter(response -> response.getResponseCase() == Api.Response.ResponseCase.COLUMN_DATA)
                .toList();
        Assertions.assertEquals(4, columnDataEvents.size());

        List<Api.Response> expectedColumnDataEvents = List.of(
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("*")
                                .setTableName("B")
                                .addAllData(List.of("USA", "UK", "Spain"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.STRING)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("USA")
                                .setTableName("B")
                                .addAllData(List.of("50.0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.DOUBLE)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("UK")
                                .setTableName("B")
                                .addAllData(List.of("20.0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.DOUBLE)
                                .build())
                        .build(),
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(Api.ColumnData.newBuilder()
                                .setStartRow(0)
                                .setEndRow(100)
                                .setVersion(2)
                                .setColumnName("Spain")
                                .setTableName("B")
                                .addAllData(List.of("30.0"))
                                .setIsNested(false)
                                .setType(Api.ColumnDataType.DOUBLE)
                                .build())
                        .build()
        );

        MatcherAssert.assertThat(columnDataEvents,
                Matchers.containsInAnyOrder(expectedColumnDataEvents.toArray()));
    }

    @Test
    void testCompileErrors() throws Exception {
        ProjectContext project = projectManager.create("Project1");
        project.updateWorksheet("Sheet1", 1, "");

        // add expected responses count, used in ClientMessageHandler to complete a future task
        singleClientMessageHandler.setExpectedResponses(1);

        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("testId1", "Project1", 2, "Sheet1", """
                table t1
                    dim [a] = RANGE(3)
                        [b] = [a] + 7
                        
                table t2
                    dim [source] = t3 
                """);
        wsSession.sendMessage(toTextMessage(putWorksheetRequest));

        singleClientMessageHandler.getFutureTask().get(1, TimeUnit.SECONDS);

        wsSession.close(CloseStatus.NORMAL);

        Api.Response errorResponse = Api.Response.newBuilder()
                .setStatus(Api.Status.SUCCEED)
                .setId("testId1")
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setVersion(3)
                        .setContent("""
                                table t1
                                    dim [a] = RANGE(3)
                                        [b] = [a] + 7
                                        
                                table t2
                                    dim [source] = t3 
                                """)
                        .setIsDeleted(false)
                        .addCompilationErrors(Api.CompilationError.newBuilder()
                                .setTableName("t2")
                                .setMessage("Unknown table: t3")
                                .build())
                        .addCompilationErrors(Api.CompilationError.newBuilder()
                                .setFieldName("source")
                                .setTableName("t2")
                                .setMessage("Unknown table: t3")
                                .build())
                        .build())
                .build();

        List<Api.Response> actualResponses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(1, actualResponses.size());

        Assertions.assertEquals(errorResponse, actualResponses.get(0));
    }

    @Test
    void testFunctions() throws Exception {
        Api.Request request = Api.Request.newBuilder()
                .setFunctionRequest(Api.FunctionRequest.newBuilder().build())
                .build();

        singleClientMessageHandler.setExpectedResponses(1);
        wsSession.sendMessage(toTextMessage(request));
        singleClientMessageHandler.getFutureTask().get(10, TimeUnit.SECONDS);

        List<Api.Response> responses = singleClientMessageHandler.getResponses();
        Assertions.assertEquals(responses.size(), 1);

        Api.FunctionResponse functions = responses.get(0).getFunctionResponse();
        Assertions.assertTrue(functions.getFunctionsCount() > 20);
    }

    static Api.Response toApiMessage(TextMessage message) throws InvalidProtocolBufferException {
        Api.Response.Builder responseBuilder = Api.Response.newBuilder();
        String json = message.getPayload();

        JsonFormat.parser().merge(json, responseBuilder);

        return responseBuilder.build();
    }

    @Slf4j
    private static class SingleClientMessageHandler extends TextWebSocketHandler {

        private CompletableFuture<Void> future;

        @Setter
        private int expectedResponses;

        // collection of server responses and events
        private final List<Api.Response> responses = new LinkedList<>();

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            future = new CompletableFuture<>();
            log.info("Connection established");
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
            log.info(message.getPayload());

            Api.Response response = toApiMessage(message);
            responses.add(response);

            if (responses.size() == expectedResponses) {
                future.complete(null);
            }
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
            log.info("Connection closed");
        }

        public List<Api.Response> getResponses() {
            return responses;
        }

        public CompletableFuture<Void> getFutureTask() {
            return future;
        }
    }

    public static Api.Response jsonResponse(String json) throws IOException {
        Api.Response.Builder builder = Api.Response.newBuilder();
        JsonFormat.parser().merge(json, builder);
        return builder.build();
    }
}
