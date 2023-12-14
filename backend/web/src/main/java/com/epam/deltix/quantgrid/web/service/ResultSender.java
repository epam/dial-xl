package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.epam.deltix.quantgrid.web.utils.WebSocketUtils;
import lombok.AllArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.jetbrains.annotations.Nullable;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ExecutorService;

@AllArgsConstructor
@Slf4j
public class ResultSender implements ResultListener {

    private final SubscriptionManager subscriptionManager;

    private final ExecutorService executor;

    @Setter
    private volatile String projectName;

    @Override
    public void onUpdate(String tableName, String fieldName, long start, long end, boolean content, long version,
                         @Nullable Table value, @Nullable String error, ResultType resultType) {
        Set<String> subscribers = subscriptionManager.getSubscribers(projectName, tableName, fieldName, start, end);
        if (subscribers.isEmpty()) {
            return;
        }

        Api.ColumnData data = ApiMessageMapper.toColumnData(tableName, fieldName, start, end, content,
                version, value, error, resultType);

        TextMessage message = WebSocketUtils.toTextMessage(
                Api.Response.newBuilder()
                        .setStatus(Api.Status.SUCCEED)
                        .setColumnData(data)
                        .build()
        );

        executor.submit(() -> {
            subscribers.forEach(sessionId -> {
                WebSocketSession session = subscriptionManager.getSession(sessionId);
                try {
                    WebSocketUtils.sendWebsocketMessage(session, message);
                } catch (IOException e) {
                    log.error("Failed to result to the client " + sessionId, e);
                }
            });
        });
    }
}
