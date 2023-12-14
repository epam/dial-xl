package com.epam.deltix.quantgrid.engine.spark

import org.apache.spark.sql.catalyst.expressions.{Attribute, Expression, UnsafeRow}
import org.apache.spark.sql.catalyst.plans.logical.{LogicalPlan, UnaryNode}
import org.apache.spark.sql.{Column, DataFrame}

case class GapFiller(child: LogicalPlan,
                     partitionRanges: Array[Long],
                     rowNum: Int,
                     rowNumExpr: Expression,
                     zero: UnsafeRow) extends UnaryNode {

  override def output: Seq[Attribute] = child.output

  override def maxRows: Option[Long] = child.maxRows

  override protected def withNewChildInternal(newChild: LogicalPlan): LogicalPlan = copy(child = newChild)
}

case class GapFillerTransform(rowNumPosition: Int, partitionRanges: Array[Long], rowNumCol: Column, zero: UnsafeRow) {

  def apply(df: DataFrame): DataFrame = {
    val gapFiller = GapFiller(df.queryExecution.analyzed, partitionRanges, rowNumPosition, rowNumCol.expr, zero)
    new DataFrame(df.sparkSession, gapFiller, df.encoder)
  }
}
