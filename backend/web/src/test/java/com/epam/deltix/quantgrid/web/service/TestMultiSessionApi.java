package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.web.utils.ApiUtils;
import com.epam.deltix.quantgrid.web.utils.LocalStorageUtils;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.WebSocketClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.util.List;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

import static com.epam.deltix.quantgrid.web.service.TestSingleSessionApi.toApiMessage;
import static com.epam.deltix.quantgrid.web.utils.WebSocketUtils.toTextMessage;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TestMultiSessionApi {

    @LocalServerPort
    private Integer serverPort;

    @Autowired
    private ProjectManager projectManager;

    @Autowired
    private SubscriptionManager subscriptionManager;

    @Value("${web.storage.local.projectsFolder}")
    private String projectsFolder;

    private WebSocketSession client1;
    private WebSocketSession client2;

    private MultiClientMessageHandler clientMessageHandler;

    @BeforeEach
    public void init() {
        // clean projects folder
        LocalStorageUtils.cleanDirectory(Path.of(projectsFolder));
        // invalidate caches
        projectManager.invalidateAll();
        subscriptionManager.invalidateAll();
        WebSocketClient webSocketClient = new StandardWebSocketClient();
        clientMessageHandler = new MultiClientMessageHandler();
        try {
            client1 = webSocketClient.execute(clientMessageHandler,
                    new WebSocketHttpHeaders(), URI.create(String.format("ws://localhost:%s/ws", serverPort))).get();
            client2 = webSocketClient.execute(clientMessageHandler,
                    new WebSocketHttpHeaders(), URI.create(String.format("ws://localhost:%s/ws", serverPort))).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testApiEvents() throws IOException, ExecutionException, InterruptedException,
            TimeoutException {
        // 2 client connected
        String client1Session = client1.getId();
        String client2Session = client2.getId();

        // CreateProject request, 1 response and 1 event expected
        CompletableFuture<Void> createProjectFuture = clientMessageHandler.waitResponses(2);
        Api.Request createProjectRequest = ApiUtils.createProjectRequest("session1-id1", "Project1");
        client1.sendMessage(toTextMessage(createProjectRequest));

        Api.ProjectState createdProjectState = Api.ProjectState.newBuilder()
                .setProjectName("Project1")
                .setIsDeleted(false)
                .setVersion(1)
                .build();

        Api.Response createdProjectResponse = Api.Response.newBuilder()
                .setId("session1-id1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(createdProjectState)
                .build();

        Api.Response createdProjectEvent = Api.Response.newBuilder()
                .setProjectState(createdProjectState)
                .build();

        // wait responses
        createProjectFuture.get(1, TimeUnit.SECONDS);
        // first client expects only 1 response
        assertClientState(client1Session, List.of(), List.of(createdProjectResponse));
        // second client expects only 1 event
        assertClientState(client2Session, List.of(createdProjectEvent), List.of());
        // clear client state
        clientMessageHandler.clear();

        // PutWorksheet request, 1 response expected
        CompletableFuture<Void> putWorksheetFuture = clientMessageHandler.waitResponses(1);
        Api.Request putWorksheetRequest = ApiUtils.putWorksheetRequest("session1-id2", "Project1", 1, "Sheet1", "DSL");
        client1.sendMessage(toTextMessage(putWorksheetRequest));

        Api.Response putWorksheetResponse = Api.Response.newBuilder()
                .setId("session1-id2")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(Api.WorksheetState.newBuilder()
                        .setProjectName("Project1")
                        .setSheetName("Sheet1")
                        .setContent("DSL")
                        .setIsDeleted(false)
                        .setVersion(2)
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("extraneous input 'DSL' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build();
        // wait responses
        putWorksheetFuture.get(1, TimeUnit.SECONDS);
        // first client expects only 1 response
        assertClientState(client1Session, List.of(), List.of(putWorksheetResponse));
        // second client does not expect any messages
        assertClientState(client2Session, List.of(), List.of());
        // clear client state
        clientMessageHandler.clear();

        // OpenProject and PutWorksheet requests, 2 responses and 1 event expected
        CompletableFuture<Void> putWorksheet2Future = clientMessageHandler.waitResponses(3);
        Api.Request openProjectRequest = ApiUtils.openProjectRequest("session2-id1", "Project1");
        client2.sendMessage(toTextMessage(openProjectRequest));
        Api.Request putWorksheetRequest2 =
                ApiUtils.putWorksheetRequest("session2-id2", "Project1", 2, "Sheet1", "DSL2");
        client2.sendMessage(toTextMessage(putWorksheetRequest2));

        Api.Response opendProjectResponse = Api.Response.newBuilder()
                .setId("session2-id1")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(Api.ProjectState.newBuilder()
                        .setProjectName("Project1")
                        .setIsDeleted(false)
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
                        .build())
                .build();
        Api.WorksheetState worksheetState = Api.WorksheetState.newBuilder()
                .setProjectName("Project1")
                .setSheetName("Sheet1")
                .setContent("DSL")
                .setIsDeleted(false)
                .setVersion(3)
                .setContent("DSL2")
                .addParsingErrors(Api.ParsingError.newBuilder()
                        .setLine(1)
                        .setPosition(0)
                        .setMessage("extraneous input 'DSL2' expecting {<EOF>, '!', 'table'}")
                        .build())
                .build();
        Api.Response putWorksheet2Response = Api.Response.newBuilder()
                .setId("session2-id2")
                .setStatus(Api.Status.SUCCEED)
                .setWorksheetState(worksheetState)
                .build();
        Api.Response putWorksheet2Event = Api.Response.newBuilder()
                .setWorksheetState(worksheetState)
                .build();

        // wait responses
        putWorksheet2Future.get(1, TimeUnit.SECONDS);
        // first client expects only 1 event
        assertClientState(client1Session, List.of(putWorksheet2Event), List.of());
        // second client expects 2 responses
        assertClientState(client2Session, List.of(), List.of(opendProjectResponse, putWorksheet2Response));
        // clear client state
        clientMessageHandler.clear();

        // CloseProject requests, 2 response messages expected
        CompletableFuture<Void> closeProjectFuture = clientMessageHandler.waitResponses(2);
        Api.Request closeProjectRequest1 = ApiUtils.closeProjectRequest("session1-id3", "Project1");
        client1.sendMessage(toTextMessage(closeProjectRequest1));
        Api.Request closeProjectRequest2 = ApiUtils.closeProjectRequest("session2-id3", "Project1");
        client2.sendMessage(toTextMessage(closeProjectRequest2));

        Api.ProjectState closedProjectState = Api.ProjectState.newBuilder()
                .setProjectName("Project1")
                .setIsDeleted(false)
                .setVersion(3)
                .addSheets(Api.WorksheetState.newBuilder()
                        .setContent("DSL2")
                        .setVersion(3)
                        .setSheetName("Sheet1")
                        .setIsDeleted(false)
                        .setProjectName("Project1")
                        .addParsingErrors(Api.ParsingError.newBuilder()
                                .setLine(1)
                                .setPosition(0)
                                .setMessage("extraneous input 'DSL2' expecting {<EOF>, '!', 'table'}")
                                .build())
                        .build())
                .build();

        Api.Response closeProjectResponse1 = Api.Response.newBuilder()
                .setId("session1-id3")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(closedProjectState)
                .build();
        Api.Response closeProjectResponse2 = Api.Response.newBuilder()
                .setId("session2-id3")
                .setStatus(Api.Status.SUCCEED)
                .setProjectState(closedProjectState)
                .build();

        // wait responses
        closeProjectFuture.get(1, TimeUnit.SECONDS);
        // first client expects 1 response
        assertClientState(client1Session, List.of(), List.of(closeProjectResponse1));
        // second client expects 1 responses
        assertClientState(client2Session, List.of(), List.of(closeProjectResponse2));
        // clear client state
        clientMessageHandler.clear();

        // assert that project do not have any subscriptions
        Set<String> projectSubscribers = subscriptionManager.getProjectSubscribersSnapshot("Project1");
        Assertions.assertIterableEquals(Set.of(), projectSubscribers);
        List<WebSocketSession> sessions = subscriptionManager.getAllSessionsSnapshot();
        Assertions.assertEquals(2, sessions.size());
    }

    private void assertClientState(String clientId, List<Api.Response> expectedEvents,
                                   List<Api.Response> expectedResponses) {
        Queue<Api.Response> actualEvents = clientMessageHandler.getClientEvents(clientId);
        Queue<Api.Response> actualResponses = clientMessageHandler.getClientResponses(clientId);

        Assertions.assertIterableEquals(expectedEvents, actualEvents);
        Assertions.assertIterableEquals(expectedResponses, actualResponses);
    }

    static boolean isResponseMessage(Api.Response response) {
        return response.hasId() && response.hasStatus();
    }

    @Slf4j
    private static class MultiClientMessageHandler extends TextWebSocketHandler {

        private final ConcurrentMap<String, Queue<Api.Response>> clientResponses = new ConcurrentHashMap<>();
        private final ConcurrentMap<String, Queue<Api.Response>> clientEvents = new ConcurrentHashMap<>();

        private CompletableFuture<Void> future;
        private final AtomicInteger expectedMessages = new AtomicInteger(0);

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
            log.info(message.getPayload());

            Api.Response response = toApiMessage(message);
            ConcurrentMap<String, Queue<Api.Response>> queue =
                    isResponseMessage(response) ? clientResponses : clientEvents;
            queue.computeIfAbsent(session.getId(), k -> new LinkedBlockingDeque<>()).add(response);

            if (expectedMessages.decrementAndGet() == 0) {
                future.complete(null);
            }
        }

        public CompletableFuture<Void> waitResponses(int expectedMessages) {
            future = new CompletableFuture<>();
            this.expectedMessages.set(expectedMessages);

            return future;
        }

        public Queue<Api.Response> getClientResponses(String sessionId) {
            return clientResponses.computeIfAbsent(sessionId, k -> new LinkedBlockingDeque<>());
        }

        public Queue<Api.Response> getClientEvents(String sessionId) {
            return clientEvents.computeIfAbsent(sessionId, k -> new LinkedBlockingDeque<>());
        }

        public void clear() {
            clientEvents.clear();
            clientResponses.clear();
        }
    }
}
