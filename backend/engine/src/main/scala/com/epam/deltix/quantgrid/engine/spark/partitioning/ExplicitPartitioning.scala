package com.epam.deltix.quantgrid.engine.spark.partitioning

import org.apache.spark.sql.catalyst.expressions.Expression
import org.apache.spark.sql.catalyst.plans.logical.{LogicalPlan, RepartitionOperation}
import org.apache.spark.sql.catalyst.plans.physical.{Distribution, HashPartitioning, Partitioning}
import org.apache.spark.sql.execution.exchange.ShuffleExchangeExec

/**
 * An expression that is used to determine a partition number for each record, basically
 * uses a generated number directly.
 */
class ExplicitPartitioning(expression: Seq[Expression], numPartitions: Int)
  extends HashPartitioning(expression, numPartitions) {

  require(expression.size == 1, s"Number of expression ($numPartitions) must be 1.")

  override def satisfies0(required: Distribution): Boolean =
    super.satisfies0(required)

  override def partitionIdExpression: Expression =
    expression.head
}

/**
 * Custom [[LogicalPlan]] that will be replaced by [[ShuffleExchangeExec]] applying custom partitioning.
 */
case class ExplicitRepartition(partitionExpression: Expression,
                               child: LogicalPlan,
                               numPartitions: Int) extends RepartitionOperation {

  require(numPartitions > 0, s"Number of partitions ($numPartitions) must be positive.")

  val partitioning: Partitioning =
    new ExplicitPartitioning(Seq(partitionExpression), numPartitions)

  override def shuffle: Boolean = true

  override protected def withNewChildInternal(newChild: LogicalPlan): LogicalPlan =
    copy(child = newChild)
}
