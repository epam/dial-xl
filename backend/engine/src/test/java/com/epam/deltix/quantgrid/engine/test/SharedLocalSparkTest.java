package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.spark.Spark.SparkConfig;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInstance;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class SharedLocalSparkTest {

    public static final int MAX_PARTITION_BYTES_DEFAULT = 150;

    protected SparkSession spark;
    protected JavaSparkContext javaSparkContext;

    // temp path where tests can write data; recreated for every test method
    protected Path basePath;

    @BeforeAll
    public final void setup() {
        spark = createSparkSession();
        javaSparkContext = JavaSparkContext.fromSparkContext(spark.sparkContext());
        basePath = TestFiles.baseTestPath(this.getClass());
    }

    @BeforeEach
    public final void setupEach() {
        TestFiles.deleteDir(basePath);
        TestFiles.createDir(basePath);
    }

    @AfterEach
    public final void teardownEach() {
        TestFiles.deleteDir(basePath);
    }

    @AfterAll
    public final void teardown() {
        if (spark != null) {
            Spark.close(spark);
        }
    }

    /**
     * Specify your own way to create SparkSession if needed
     */
    protected SparkSession createSparkSession() {
        return createSparkSession(Map.of());
    }

    protected SparkSession createSparkSession(Map<String, String> configOverride) {
        Map<String, String> extraConf = new HashMap<>(Map.of(
                "spark.ui.enabled", "false",
                "spark.driver.bindAddress", "localhost",
                "spark.sql.files.maxPartitionBytes", String.valueOf(MAX_PARTITION_BYTES_DEFAULT),
                "spark.sql.shuffle.partitions", "5",
                "spark.kryo.registrationRequired", "true" // to detect unregistered classes, fails if exist
        ));
        extraConf.putAll(configOverride);
        SparkConfig conf = SparkConfig.builder()
                .appName("local-test")
                .masterUrl("local[3]")
                .extraConfig(extraConf)
                .build();
        return Spark.getOrCreate(conf);
    }
}
