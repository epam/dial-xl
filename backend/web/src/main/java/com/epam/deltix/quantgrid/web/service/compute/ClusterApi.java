package com.epam.deltix.quantgrid.web.service.compute;

import lombok.SneakyThrows;
import org.jetbrains.annotations.TestOnly;
import org.redisson.api.FunctionMode;
import org.redisson.api.FunctionResult;
import org.redisson.api.RFunction;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

class ClusterApi {

    private final String namespace;
    private final RFunction functions;

    public ClusterApi(RedissonClient client, String namespace) {
        Objects.requireNonNull(namespace);
        this.namespace = "{" + namespace + "}";
        this.functions = client.getFunction(StringCodec.INSTANCE);
        this.functions.loadAndReplace("qg_cluster", loadCode());
    }

    @TestOnly
    void evict() {
        functions.call(FunctionMode.WRITE, "qg_cluster_evict", FunctionResult.BOOLEAN, List.of(namespace));
    }

    boolean addComputeNode(String nodeId, String nodeEndpoint, long nodeTimeout) {
        return functions.call(FunctionMode.WRITE, "qg_cluster_add_compute_node", FunctionResult.BOOLEAN,
                List.of(namespace), nodeId, nodeEndpoint, nodeTimeout);
    }

    boolean removeComputeNode(String nodeId) {
        return functions.call(FunctionMode.WRITE, "qg_cluster_remove_compute_node", FunctionResult.BOOLEAN,
                List.of(namespace), nodeId);
    }

    boolean heartbeatComputeNode(String nodeId, long nodeTimeout) {
        return functions.call(FunctionMode.WRITE, "qg_cluster_heartbeat_compute_node", FunctionResult.BOOLEAN,
                List.of(namespace), nodeId, nodeTimeout);
    }

    String beginComputeOperation(String projectId, long projectTimeout,
                                 String operationId, long operationTimeout) {
         return functions.call(FunctionMode.WRITE, "qg_cluster_begin_compute_operation", FunctionResult.STRING,
                 List.of(namespace),
                 projectId, Long.toString(projectTimeout),
                 operationId, Long.toString(operationTimeout));
    }

    boolean completeComputeOperation(String operationId) {
        return functions.call(FunctionMode.WRITE, "qg_cluster_complete_compute_operation", FunctionResult.BOOLEAN,
                List.of(namespace), operationId);
    }

    @SneakyThrows
    private static String loadCode() {
        try (InputStream stream = ClusterApi.class.getClassLoader().getResourceAsStream("qg_cluster.lua")){
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}