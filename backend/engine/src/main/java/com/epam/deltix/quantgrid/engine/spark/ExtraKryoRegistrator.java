package com.epam.deltix.quantgrid.engine.spark;

import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.engine.spark.v2.write.DataWriterV2;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.esotericsoftware.kryo.Kryo;
import lombok.val;
import org.apache.spark.serializer.KryoRegistrator;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.execution.datasources.v2.DataWritingSparkTaskResult;
import org.apache.spark.sql.execution.joins.UnsafeHashedRelation;

import java.util.ArrayList;

public class ExtraKryoRegistrator implements KryoRegistrator {

    @Override
    public void registerClasses(Kryo kryo) {
        register(kryo, new Class[] {

                // App classes
                TablePartition.class,
                ColumnPartition.class,
                ColumnType.class,

                // Spark
                UnsafeHashedRelation.class,
                InternalRow.class, InternalRow[].class,
                DataWritingSparkTaskResult.class, DataWriterV2.PartitionWrite.class,

                // Java
                ArrayList.class
        });

        registerWithName(kryo, "scala.reflect.ClassTag$GenericClassTag");
        registerWithName(kryo, "scala.collection.immutable.ArraySeq$ofRef");
    }

    private static void register(Kryo kryo, Class<?>[] classes) {
        for (val clazz : classes) {
            kryo.register(clazz);
        }
    }

    private static void registerWithName(Kryo kryo, String name) {
        try {
            Class<?> clazz = Class.forName(name, false, Spark.class.getClassLoader());
            kryo.register(clazz);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("Cannot resolve class with a name: " + name, e);
        }
    }
}
