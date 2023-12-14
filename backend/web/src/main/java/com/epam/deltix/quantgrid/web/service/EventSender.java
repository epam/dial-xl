package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.web.utils.WebSocketUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class EventSender {

    private final SubscriptionManager subscriptionManager;

    public void sendEventToAllSessions(Api.Response event, String currentSessionId) {
        TextMessage wsMessage = WebSocketUtils.toTextMessage(event);

        Collection<WebSocketSession> sessions = subscriptionManager.getAllSessionsSnapshot();
        for (WebSocketSession session : sessions) {
            // to reduce number of messages - do not send event to the client who expect same response
            if (!session.getId().equals(currentSessionId)) {
                try {
                    WebSocketUtils.sendWebsocketMessage(session, wsMessage);
                } catch (Exception e) {
                    log.error("Failed to send event to the client: " + session.getId(), e);
                }
            }
        }
    }

    public void sendEventToAllProjectSubscribers(Api.Response response, String projectName, String currentSessionId) {
        TextMessage wsMessage = WebSocketUtils.toTextMessage(response);

        Set<String> sessionIds = subscriptionManager.getProjectSubscribersSnapshot(projectName);
        for (String sessionId : sessionIds) {
            // to reduce number of messages - do not send event to the client who expect same response
            if (!currentSessionId.equals(sessionId)) {
                WebSocketSession session = subscriptionManager.getSession(sessionId);
                try {
                    WebSocketUtils.sendWebsocketMessage(session, wsMessage);
                } catch (Exception e) {
                    log.error("Failed to send event to the client: " + session.getId(), e);
                }
            }
        }
    }

}
