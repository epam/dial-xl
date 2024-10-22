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

    private NodeType nodeType = NodeType.COMPUTE;
    private RoutingType nodeRoutingType = RoutingType.HASHED;
    private String nodeId;
    private String nodeEndpoint;

    /**
     * The key to a map of all compute nodes in a cluster. Key: nodeId. Value: nodeState.
     */
    private String nodeMappingKey = "node-mapping";

    /**
     * The key prefix for a project to a node attached values:
     *  1) Project to node mapping. Key: nodeRoutingKey + ":project:" + projectId. Value: nodeId.
     *  2) Project lock. Key: nodeRoutingKey + ":lock:project:" + projectId.
     *  3) Node to project mapping. Key: nodeRoutingKey + ":node:" + nodeId. Value: projectId.
     */
    private String nodeRoutingKey = "node-routing";

    /**
     * The key to a topic where compute nodes publish join/leave events.
     */
    private String nodeTopicKey = "node-topic";
    private long nodeHeartbeatInterval = 30000;
    private long nodeHeartbeatTimeout = 60000;
    private long nodeProjectTimeout = 600000;

    @Value("${server.port:8080}")
    private int port;

    public enum NodeType {
        CONTROL, COMPUTE
    }

    public enum RoutingType {
        HASHED, DEDICATED
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