package com.epam.deltix.quantgrid.web.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.net.InetAddress;
import java.util.UUID;
import javax.annotation.PostConstruct;

@Data
@Configuration
@ConfigurationProperties(prefix = "web.cluster")
public class ClusterSettings {

    private String namespace = "qg_cluster";
    private NodeType nodeType = NodeType.COMPUTE;
    private String nodeId;
    private String nodeEndpoint;
    private long nodeHeartbeatInterval = 30000;
    private long nodeHeartbeatTimeout = 60000;
    private long nodeProjectTimeout = 86400000;
    private long nodeOperationTimeout = 3600000;
    private long nodeRouteTimeout = 10000;

    @Value("${server.port:8080}")
    private int port;

    public enum NodeType {
        CONTROL, COMPUTE
    }

    @PostConstruct
    private void init() throws Exception {
        if (nodeId == null) {
            nodeId = UUID.randomUUID().toString().replace("-", "").toLowerCase();
        }

        if (nodeEndpoint == null) {
            InetAddress localHost = InetAddress.getLocalHost();
            nodeEndpoint = localHost.getHostAddress() + ":" + port;
        }
    }
}