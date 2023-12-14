package com.epam.deltix.quantgrid.engine.spark;

import lombok.experimental.UtilityClass;
import scala.collection.immutable.Seq;
import scala.jdk.javaapi.CollectionConverters;

import java.util.List;

@UtilityClass
public class ScalaUtil {

    public <T> Seq<T> seq(T... elem) {
        return CollectionConverters.asScala(List.of(elem)).toSeq();
    }
}
