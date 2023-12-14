package com.epam.deltix.quantgrid.engine.spark

import com.epam.deltix.quantgrid.engine.spark.partitioning.ExplicitRepartition
import org.apache.spark.sql.Strategy
import org.apache.spark.sql.catalyst.plans.logical.LogicalPlan
import org.apache.spark.sql.execution.SparkPlan
import org.apache.spark.sql.execution.exchange.{REPARTITION_BY_NUM, ShuffleExchangeExec}

object CustomSparkStrategy extends Strategy {

  /**
   * Extension strategy that replaces custom logical plans with physical.
   */
  def apply(plan: LogicalPlan): Seq[SparkPlan] = plan match {
    case r: ExplicitRepartition =>
      ShuffleExchangeExec(r.partitioning, planLater(r.child), REPARTITION_BY_NUM) :: Nil
    case GapFiller(child, partitionRanges, rowNum, rowNumExpr, zero) =>
      GapFillerExec(planLater(child), partitionRanges, rowNum, rowNumExpr, zero) :: Nil
    case _ => Nil
  }
}
