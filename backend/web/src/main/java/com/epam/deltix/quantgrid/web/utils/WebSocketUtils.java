package com.epam.deltix.quantgrid.web.utils;

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import lombok.experimental.UtilityClass;
import org.epam.deltix.proto.Api;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import javax.annotation.Nullable;

@UtilityClass
public class WebSocketUtils {

    private final JsonFormat.Printer PRINTER = JsonFormat.printer().includingDefaultValueFields();

    public void sendWebsocketMessage(@Nullable WebSocketSession session, WebSocketMessage message) throws IOException {
        if (session != null && session.isOpen()) {
            session.sendMessage(message);
        }
    }

    public TextMessage toTextMessage(Api.Response message) {
        try {
            String json = PRINTER.print(message);
            return new TextMessage(json);
        } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException(e);
        }
    }

    public TextMessage toTextMessage(Api.Request message) {
        try {
            String json = PRINTER.print(message);
            return new TextMessage(json);
        } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException(e);
        }
    }
}
