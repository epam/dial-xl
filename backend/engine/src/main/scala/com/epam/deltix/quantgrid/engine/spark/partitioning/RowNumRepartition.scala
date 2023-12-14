package com.epam.deltix.quantgrid.engine.spark.partitioning

import org.apache.spark.sql.catalyst.expressions.Literal
import org.apache.spark.sql.catalyst.plans.logical.RepartitionOperation
import org.apache.spark.sql.{Column, DataFrame}

case class RowNumRepartition(rowNumberColumn: Column, ranges: Array[Long]) {

  def apply(df: DataFrame): DataFrame = {
    // inject expression to compute partition id (looks up position in the array or ranges)
    val partitionIdExpr = PartitionIdLookup(Literal(ranges), rowNumberColumn.expr)

    // keep repartition operator simple, rely on the injected expression
    val repartition: RepartitionOperation =
      ExplicitRepartition(partitionIdExpr, df.queryExecution.analyzed, ranges.length)

    new DataFrame(df.sparkSession, repartition, df.encoder)
  }
}
