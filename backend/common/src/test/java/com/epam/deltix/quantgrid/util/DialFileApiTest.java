package com.epam.deltix.quantgrid.util;

import com.epam.deltix.quantgrid.security.DialAuth;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;
import okhttp3.mockwebserver.RecordedRequest;
import org.assertj.core.util.IterableUtil;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.security.Principal;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class DialFileApiTest {
    private static final Principal PRINCIPAL = new DialAuth() {
        @Override
        public String getKey() {
            return "test-key";
        }

        @Override
        public String getValue() {
            return "test-value";
        }

        @Override
        public String getName() {
            return "";
        }
    };

    @Test
    void testListAttributes() throws Exception {
        List<DialFileApi.Attributes> expected = List.of(
                new DialFileApi.Attributes(
                        null,
                        "data.csv",
                        ".cache/26806e5a2012fb8f379725276b6ad7a33e20673f6abba7cb04f3619ede81c2dc",
                        1752059809000L,
                        List.of(),
                        null,
                        List.of()),
                new DialFileApi.Attributes(
                        null,
                        "lock.json",
                        ".cache/26806e5a2012fb8f379725276b6ad7a33e20673f6abba7cb04f3619ede81c2dc",
                        1752060109000L,
                        List.of(),
                        null,
                        List.of()),
                new DialFileApi.Attributes(
                        null,
                        "data.csv",
                        ".cache/2bcc2cebb9952638aeac4f947c71b76db6e39fcc27202e904e2349963707fbd3",
                        1752059809000L,
                        List.of(),
                        null,
                        List.of()));

        try (MockWebServer server = startMockWebServer();
            DialFileApi api = new DialFileApi(server.url("/").toString())) {
            server.enqueue(new MockResponse().setBody("""
                    {
                        "name": ".cache",
                        "items": [
                            {
                                "name": "data.csv",
                                "parentPath": ".cache/26806e5a2012fb8f379725276b6ad7a33e20673f6abba7cb04f3619ede81c2dc",
                                "updatedAt": 1752059809000
                            },
                            {
                                "name": "lock.json",
                                "parentPath": ".cache/26806e5a2012fb8f379725276b6ad7a33e20673f6abba7cb04f3619ede81c2dc",
                                "updatedAt": 1752060109000
                            }
                        ],
                        "nextToken": "next&Token"
                    }
                    """));
            server.enqueue(new MockResponse().setBody("""
                    {
                        "name": ".cache",
                        "items": [
                            {
                                "name": "data.csv",
                                "parentPath": ".cache/2bcc2cebb9952638aeac4f947c71b76db6e39fcc27202e904e2349963707fbd3",
                                "updatedAt": 1752059809000
                            }
                        ]
                    }
                    """));

            Collection<DialFileApi.Attributes> actual =
                    IterableUtil.toCollection(api.listAttributes(".cache/", PRINCIPAL));

            assertThat(actual).isEqualTo(expected);
            assertThat(server.getRequestCount()).isEqualTo(2);
            RecordedRequest firstRequest = server.takeRequest();
            assertThat(firstRequest.getPath()).isEqualTo("/v1/metadata/.cache/?recursive=true");
            RecordedRequest secondRequest = server.takeRequest();
            assertThat(secondRequest.getPath()).isEqualTo("/v1/metadata/.cache/?recursive=true&token=next%26Token");
        }
    }

    @Test
    void testFileEvents() throws Exception {
        try (MockWebServer server = startMockWebServer();
             DialFileApi api = new DialFileApi(server.url("/").toString())) {

            server.enqueue(new MockResponse().setBody("""
                   data: {"url":"files/bucket/folder/project.qg","action":"CREATE","timestamp":1,"etag":"1","new_property":"new"}
                   
                   : heartbeat
                   
                   data: {"url":"files/bucket/folder/project.qg","action":"UPDATE","timestamp":2,"etag":"2"}
                   
                   : heartbeat
                   
                   data: {"url":"files/bucket/folder/project.qg","action":"DELETE","timestamp":3}
                   
                   """).setHeader("content-type", "text/event-stream"));

            CompletableFuture<Throwable> future = new CompletableFuture<>();
            BlockingQueue<DialFileApi.FileEvent> events = new LinkedBlockingQueue<>();

            DialFileApi.FileSubscriber subscriber = new DialFileApi.FileSubscriber() {
                @Override
                public void onOpen() {
                    DialFileApi.FileEvent event = new DialFileApi.FileEvent("on_open", "0", DialFileApi.FileAction.CREATE, 0);
                    events.add(event);
                }

                @Override
                public void onEvent(DialFileApi.FileEvent event) {
                     events.add(event);
                }

                @Override
                public void onError(Throwable error) {
                     future.complete(error);
                }
            };

            api.subscribeOnFileEvents("files/bucket/folder/project.qg", subscriber, PRINCIPAL);
            Throwable error = future.get(15, TimeUnit.SECONDS);

            Assertions.assertEquals("connection is closed", error.getMessage());
            Assertions.assertEquals(IOException.class, error.getClass());

            ObjectMapper mapper = new JsonMapper();
            List<String> actual = events.stream().map(event -> {
                try {
                    return mapper.writeValueAsString(event);
                } catch (JsonProcessingException e) {
                    throw new RuntimeException(e);
                }
            }).toList();

            List<String> expected = List.of(
                    "{\"path\":\"on_open\",\"etag\":\"0\",\"action\":\"CREATE\",\"timestamp\":0}",
                    "{\"path\":\"files/bucket/folder/project.qg\",\"etag\":\"1\",\"action\":\"CREATE\",\"timestamp\":1}",
                    "{\"path\":\"files/bucket/folder/project.qg\",\"etag\":\"2\",\"action\":\"UPDATE\",\"timestamp\":2}",
                    "{\"path\":\"files/bucket/folder/project.qg\",\"etag\":null,\"action\":\"DELETE\",\"timestamp\":3}");
            Assertions.assertEquals(expected, actual);
        }
    }

    private static MockWebServer startMockWebServer() throws IOException {
        MockWebServer server = new MockWebServer();
        QueueDispatcher dispatcher = new QueueDispatcher();
        dispatcher.setFailFast(true);
        server.setDispatcher(dispatcher);
        server.start();

        return server;
    }
}