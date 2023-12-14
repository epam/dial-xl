package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.web.exception.NotFoundException;
import com.epam.deltix.quantgrid.web.exception.VersionConflictException;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.deltix.quantgrid.web.utils.WebSocketUtils;
import com.google.protobuf.InvalidProtocolBufferException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
@RequiredArgsConstructor
public class WebSocketMessageHandler extends TextWebSocketHandler {
    private final RequestDispatcher requestDispatcher;
    private final SubscriptionManager subscriptionManager;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.debug("WS session: {} established", session.getId());
        // wrap WebSocketSession to concurrent decorator to allow concurrent send with message buffering
        ConcurrentWebSocketSessionDecorator concurrentSession = wrapWebSocketSession(session);
        subscriptionManager.addSession(concurrentSession);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WS transport error for session: " + session.getId(), exception);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.debug("WS session: {} closed with: {}", session.getId(), status.toString());
        subscriptionManager.removeSession(session.getId());
    }


    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Api.Request request;
        Api.Response response;
        try {
            request = ApiMessageMapper.toApiRequest(message.getPayload());
            response = handleRequest(session.getId(), request);
        } catch (InvalidProtocolBufferException ex) {
            // failed to parse incoming request
            log.warn("Failed to parse incoming request from client: " + session.getId(), ex);
            response = Api.Response.newBuilder()
                    .setErrorMessage(ex.getMessage())
                    .setStatus(Api.Status.INVALID_PROTOCOL)
                    .build();
        }

        // send response
        TextMessage textMessage = WebSocketUtils.toTextMessage(response);
        // sending message direct to the session is not thread safe
        // that's why we need to get a correct session from subscribe manager
        WebSocketSession concurrentSession = subscriptionManager.getSession(session.getId());
        WebSocketUtils.sendWebsocketMessage(concurrentSession, textMessage);
    }

    private Api.Response handleRequest(String sessionId, Api.Request request) {
        Api.Response response;
        try {
            response = requestDispatcher.route(sessionId, request);
        } catch (Exception ex) {
            log.warn("Failed to process request " + request.getId(), ex);
            Api.Response.Builder errorResponseBuilder = Api.Response.newBuilder();
            if (ex instanceof NotFoundException) {
                errorResponseBuilder.setStatus(Api.Status.NOT_FOUND);
            } else if (ex instanceof VersionConflictException versionConflictException) {
                errorResponseBuilder.setStatus(Api.Status.VERSION_CONFLICT);
                if (versionConflictException.getProjectState() != null) {
                    errorResponseBuilder.setProjectState(versionConflictException.getProjectState());
                } else if (versionConflictException.getWorksheetState() != null) {
                    errorResponseBuilder.setWorksheetState(versionConflictException.getWorksheetState());
                }
            } else {
                errorResponseBuilder.setStatus(Api.Status.FAILED);
            }
            // handle exceptions
            response = errorResponseBuilder.setId(request.getId())
                    .setErrorMessage(ex.getMessage())
                    .build();
        }

        return response;
    }

    private static ConcurrentWebSocketSessionDecorator wrapWebSocketSession(WebSocketSession session) {
        return new ConcurrentWebSocketSessionDecorator(session, 10_000, 64 * 1024 * 1024);
    }
}
