package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.web.state.Subscription;
import com.google.common.annotations.VisibleForTesting;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class SubscriptionManager {

    // sessionId, WebsocketSession
    private final Map<String, WebSocketSession> sessions = new HashMap<>();

    // sessionId, viewportState
    private final Map<String, Subscription> clientSubscriptions = new HashMap<>();
    // projectName, sessionIds
    private final Map<String, Set<String>> projectSubscriptions = new HashMap<>();

    public synchronized void addSession(WebSocketSession session) {
        // register client session
        sessions.put(session.getId(), session);
        log.debug("Session {} added", session.getId());
    }

    public synchronized WebSocketSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    public synchronized void removeSession(String sessionId) {
        // remove user connection and unsubscribe
        unsubscribe(sessionId);
        sessions.remove(sessionId);
        log.debug("Session {} removed", sessionId);
    }

    public synchronized Subscription subscribe(String sessionId, Subscription subscription) {
        // check if session present - handle cases when incoming request not finished (subscription expected),
        // but user disconnected
        if (sessions.containsKey(sessionId)) {
            log.debug("Session {} subscribed", sessionId);
            projectSubscriptions.computeIfAbsent(subscription.getProjectName(), k -> new HashSet<>()).add(sessionId);
            return clientSubscriptions.put(sessionId, subscription);
        }

        return null;
    }

    public synchronized void unsubscribe(String sessionId) {
        Subscription subscription = clientSubscriptions.remove(sessionId);
        if (subscription != null) {
            projectSubscriptions.get(subscription.getProjectName()).remove(sessionId);
        }
        log.debug("Session {} unsubscribed", sessionId);
    }

    public synchronized Set<String> getProjectSubscribersSnapshot(String projectName) {
        Set<String> subscribers = projectSubscriptions.get(projectName);
        return subscribers == null ? Set.of() : new HashSet<>(subscribers);
    }

    public synchronized Set<Subscription> getProjectSubscriptionsSnapshot(String projectName) {
        Set<String> projectSubscribers = projectSubscriptions.get(projectName);
        if (projectSubscribers == null) {
            return Set.of();
        }

        HashSet<Subscription> subscriptions = new HashSet<>();
        for (String sessionId : projectSubscribers) {
            Subscription subscription = clientSubscriptions.get(sessionId);
            subscriptions.add(subscription);
        }
        return subscriptions;
    }

    public synchronized Set<String> getSubscribers(String projectName, String tableName, String fieldName,
                                                   long start, long end) {
        Set<String> projectSubscribers = projectSubscriptions.get(projectName);
        if (projectSubscribers == null) {
            return Set.of();
        }

        HashSet<String> subscribers = new HashSet<>();
        for (String sessionId : projectSubscribers) {
            Subscription subscription = clientSubscriptions.get(sessionId);
            Api.Viewport tableViewport = subscription.getViewports().get(tableName);
            if (tableViewport != null && tableViewport.getStartRow() == start && tableViewport.getEndRow() == end) {
                subscribers.add(sessionId);
            }
        }
        return subscribers;
    }

    public synchronized void unsubscribeFromProject(String projectName) {
        // remove all project subscribers, typically because project was deleted
        Set<String> sessionIds = projectSubscriptions.remove(projectName);
        sessionIds.forEach(clientSubscriptions::remove);
        log.debug("All subscribers removed from project {}", projectName);
    }

    public synchronized void remapProjectName(String oldProjectName, String newProjectName) {
        // remap all subscribers from one project name to another due to ProjectRename request
        Set<String> subscribedSessions = projectSubscriptions.remove(oldProjectName);
        projectSubscriptions.put(newProjectName, subscribedSessions);
        for (String sessionId : subscribedSessions) {
            clientSubscriptions.computeIfPresent(sessionId,
                    (k, oldSubscription) -> new Subscription(newProjectName, oldSubscription.getViewports()));
        }
    }

    public synchronized List<WebSocketSession> getAllSessionsSnapshot() {
        return List.copyOf(sessions.values());
    }

    @VisibleForTesting
    public synchronized void invalidateAll() {
        clientSubscriptions.clear();
        projectSubscriptions.clear();
        sessions.clear();
    }
}
