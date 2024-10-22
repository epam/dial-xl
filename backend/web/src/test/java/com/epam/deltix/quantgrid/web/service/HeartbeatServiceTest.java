package com.epam.deltix.quantgrid.web.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@TestPropertySource(properties = {"web.heartbeatPeriodMillis=100"})
class HeartbeatServiceTest {
    @Autowired
    private HeartbeatService heartbeatService;

    @Mock
    private SseEmitter sseEmitter;

    @Captor
    private ArgumentCaptor<SseEmitter.SseEventBuilder> sseEvent;

    @Test
    void testHeartbeats() throws InterruptedException, IOException {
        heartbeatService.addEmitter(sseEmitter);
        Thread.sleep(290);

        // 2 heartbeats expected after 290 milliseconds
        verify(sseEmitter, times(2)).send(sseEvent.capture());

        List<ResponseBodyEmitter.DataWithMediaType> events = sseEvent.getAllValues().stream()
                .map(SseEmitter.SseEventBuilder::build)
                .flatMap(Collection::stream)
                .toList();
        assertThat(events).hasSize(2)
                .extracting(ResponseBodyEmitter.DataWithMediaType::getData)
                .isEqualTo(List.of(":heartbeat\n\n", ":heartbeat\n\n"));
    }
}