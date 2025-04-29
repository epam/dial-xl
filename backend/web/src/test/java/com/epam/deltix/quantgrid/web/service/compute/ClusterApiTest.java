package com.epam.deltix.quantgrid.web.service.compute;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import redis.embedded.RedisServer;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;

class ClusterApiTest {

    private RedisServer server;
    private RedissonClient client;
    private ClusterApi cluster;

    @BeforeEach
    void beforeTest() {
        server = RedisServer.builder()
                .port(16370)
                .bind("127.0.0.1")
                .setting("maxmemory 16M")
                .setting("maxmemory-policy volatile-lfu")
                .build();
        server.start();

        Config config = new Config();
        config.useSingleServer().setAddress("redis://127.0.0.1:16370");
        client = Redisson.create(config);

        cluster = new ClusterApi(client, "qg_cluster");
    }

    @AfterEach
    void afterTest() {
        if (server != null) {
            server.stop();
        }

        if (client != null) {
            client.shutdown();
        }
    }

    @Test
    void testAddAndRemove() {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));
        Assertions.assertFalse(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));

        Assertions.assertTrue(cluster.heartbeatComputeNode("node.1", 10000));
        assertKeys("{qg_cluster}.node.node.1", "{qg_cluster}.nodes", "{qg_cluster}.nodes_free");

        Assertions.assertTrue(cluster.removeComputeNode("node.1"));
        Assertions.assertFalse(cluster.removeComputeNode("node.1"));
        Assertions.assertFalse(cluster.removeComputeNode("node.2"));

        Assertions.assertFalse(cluster.heartbeatComputeNode("node.1", 10000));
        Assertions.assertFalse(cluster.heartbeatComputeNode("node.2", 10000));

        assertKeys();
    }

    @Test
    void testAddAndBeginAndRemove() {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 10000),
                "node.1.endpoint");
        Assertions.assertNull(cluster.beginComputeOperation("project.1", 10000, "operation.1", 10000));

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.2", 10000),
                "node.1.endpoint");
        Assertions.assertNull(cluster.beginComputeOperation("project.1", 10000, "operation.1", 10000));

        Assertions.assertNull(cluster.beginComputeOperation("project.2", 10000, "operation.3", 10000));
        assertKeys(
                "{qg_cluster}.project.project.1",
                "{qg_cluster}.operation.operation.2",
                "{qg_cluster}.operations",
                "{qg_cluster}.operation.operation.1",
                "{qg_cluster}.node_operations.node.1",
                "{qg_cluster}.node.node.1",
                "{qg_cluster}.nodes");

        Assertions.assertTrue(cluster.removeComputeNode("node.1"));
        assertKeys("{qg_cluster}.project.project.1");
    }

    @Test
    void testBeginAndComplete() {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 10000),
                "node.1.endpoint");
        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.2", 10000),
                "node.1.endpoint");

        Assertions.assertTrue(cluster.completeComputeOperation("operation.2"));
        Assertions.assertFalse(cluster.completeComputeOperation("operation.2"));

        Assertions.assertTrue(cluster.completeComputeOperation("operation.1"));
        Assertions.assertFalse(cluster.completeComputeOperation("operation.1"));

        assertKeys("{qg_cluster}.node.node.1", "{qg_cluster}.nodes", "{qg_cluster}.nodes_free", "{qg_cluster}.project.project.1");

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.3", 10000),
                "node.1.endpoint");
        Assertions.assertTrue(cluster.completeComputeOperation("operation.3"));

        assertKeys("{qg_cluster}.node.node.1", "{qg_cluster}.nodes", "{qg_cluster}.nodes_free", "{qg_cluster}.project.project.1");

        Assertions.assertTrue(cluster.removeComputeNode("node.1"));
        assertKeys("{qg_cluster}.project.project.1");
    }

    @Test
    void testOperationEviction() throws Exception {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 100),
                "node.1.endpoint");

        assertKeys("{qg_cluster}.nodes", "{qg_cluster}.node.node.1", "{qg_cluster}.node_operations.node.1",
                "{qg_cluster}.project.project.1",
                "{qg_cluster}.operations", "{qg_cluster}.operation.operation.1");

        Thread.sleep(150);
        cluster.evict();

        assertKeys("{qg_cluster}.nodes", "{qg_cluster}.nodes_free", "{qg_cluster}.node.node.1",
                "{qg_cluster}.project.project.1");

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 100),
                "node.1.endpoint");
        Thread.sleep(150);

        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 100),
                "node.1.endpoint");

        Assertions.assertTrue(cluster.removeComputeNode("node.1"));
        assertKeys("{qg_cluster}.project.project.1");
    }

    @Test
    void testNodeEviction() throws Exception {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 100));
        Thread.sleep(150);

        Assertions.assertFalse(cluster.removeComputeNode("node.1"));
        assertKeys();
    }

    @Test
    void testProjectWithDifferentNodes() {
        Assertions.assertTrue(cluster.addComputeNode("node.1", "node.1.endpoint", 10000));
        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.1", 10000),
                "node.1.endpoint");
        Assertions.assertTrue(cluster.completeComputeOperation("operation.1"));
        Assertions.assertTrue(cluster.removeComputeNode("node.1"));

        Assertions.assertTrue(cluster.addComputeNode("node.2", "node.2.endpoint", 10000));
        Assertions.assertEquals(cluster.beginComputeOperation("project.1", 10000, "operation.2", 10000),
                "node.2.endpoint");
        Assertions.assertTrue(cluster.completeComputeOperation("operation.2"));
        Assertions.assertTrue(cluster.removeComputeNode("node.2"));
    }

    private void assertKeys(String... expected) {
        Set<String> keys = new TreeSet<>();

        for (String key : client.getKeys().getKeys()) {
            keys.add(key);
        }

        Assertions.assertIterableEquals(new TreeSet<>(List.of(expected)), keys.stream().toList());
    }
}