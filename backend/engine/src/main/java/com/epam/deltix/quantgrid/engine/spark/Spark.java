package com.epam.deltix.quantgrid.engine.spark;

import lombok.Builder;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.SparkConf;
import org.apache.spark.SparkContext;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.serializer.KryoSerializer;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.SparkSessionExtensions;
import scala.runtime.BoxedUnit;

import java.util.Map;

@Slf4j
@UtilityClass
public class Spark {

    @Builder
    public record SparkConfig(String appName, String masterUrl, Map<String, String> extraConfig) {
    }

    public static SparkSession getOrCreate(SparkConfig sparkConfig) {
        log.info("Creating Spark session with config: {}", sparkConfig);
        var extraConf = new SparkConf();

        extraConf.set("spark.kryo.unsafe", "true");
        extraConf.set("spark.serializer", KryoSerializer.class.getName());
        extraConf.set("spark.kryo.registrator", ExtraKryoRegistrator.class.getName());
        extraConf.set("spark.kryo.referenceTracking", "false");

        // any standard ORC configuration can be passed with 'spark.hadoop' prefix to pass it to Configuration
        extraConf.set("spark.hadoop.orc.compress", "LZ4");

        for (Map.Entry<String, String> c : sparkConfig.extraConfig().entrySet()) {
            extraConf.set(c.getKey(), c.getValue());
        }
        return SparkSession.builder()
                .withExtensions((SparkSessionExtensions extensions) -> {
                    extensions.injectPlannerStrategy(s -> CustomSparkStrategy$.MODULE$);
                    return BoxedUnit.UNIT;
                })
                .appName(sparkConfig.appName())
                .master(sparkConfig.masterUrl())
                .config(extraConf)
                .getOrCreate();
    }

    public static SparkSession session() {
        return SparkSession.active();
    }

    public static SparkContext context() {
        return session().sparkContext();
    }

    public static JavaSparkContext javaContext() {
        return JavaSparkContext.fromSparkContext(context());
    }

    public static void close(SparkSession spark) {
        log.info("Closing Spark session of '{}' app", spark.sparkContext().appName());
        spark.close();
        SparkSession.clearActiveSession();
        SparkSession.clearDefaultSession();
    }
}
