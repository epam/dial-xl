package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.controller.CalculateController.Sender;
import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.google.protobuf.util.JsonFormat;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Slf4j
@WebMvcTest(CalculateController.class)
class CalculateControllerHeartbeatTest {
    private static final String TEST_ID = UUID.randomUUID().toString();
    private static final JsonFormat.Printer PRINTER = JsonFormat.printer();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ComputeService computeService;

    @MockitoBean
    private HeartbeatService heartbeatService;

    @Captor
    private ArgumentCaptor<SseEmitter> emitter;

    @Captor
    private ArgumentCaptor<Sender> sender;

    @Test
    void testCalculateHeartbeat() throws Exception {
        AtomicInteger cancels = new AtomicInteger();
        ComputeService.ComputeTask task = cancels::incrementAndGet;
        when(computeService.compute(any(), any(), any())).thenReturn(task);

        Api.Request request = Api.Request.newBuilder()
                .setId(TEST_ID)
                .setCalculateWorksheetsRequest(Api.CalculateWorksheetsRequest.newBuilder()
                        .putAllWorksheets(Map.of("Test", """
                                table A
                                  [a] = 1
                                """)))
                .build();

        MockHttpServletResponse response = mockMvc.perform(post("/v1/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRINTER.print(request))
                        .with(jwt()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse();

        verify(heartbeatService).addEmitter(emitter.capture());
        verify(computeService).compute(any(), sender.capture(), any());

        emitter.getValue().send(SseEmitter.event().comment("heartbeat"));
        sender.getValue().onComplete();

        String events = response.getContentAsString();

        assertThat(events).isEqualTo("""
                :heartbeat
                
                data:[DONE]
                
                """);

        assertThat(cancels.get()).isEqualTo(0);
    }
}