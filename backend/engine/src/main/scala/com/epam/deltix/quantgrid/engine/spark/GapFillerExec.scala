package com.epam.deltix.quantgrid.engine.spark

import org.apache.spark.rdd.RDD
import org.apache.spark.sql.catalyst.InternalRow
import org.apache.spark.sql.catalyst.expressions.{Attribute, Expression, SortOrder, UnsafeRow}
import org.apache.spark.sql.catalyst.plans.physical.{Distribution, Partitioning}
import org.apache.spark.sql.execution.{SparkPlan, UnaryExecNode}

case class GapFillerExec(child: SparkPlan,
                         partitionRanges: Array[Long],
                         rowNum: Int,
                         rowNumExpr: Expression, // ensures that row number column is not dropped before GapFiller
                         zero: UnsafeRow) extends UnaryExecNode {

  override def output: Seq[Attribute] = child.output

  override protected def withNewChildInternal(newChild: SparkPlan): SparkPlan =
    copy(child = newChild)

  override def outputPartitioning: Partitioning =
    child.outputPartitioning

  override def requiredChildDistribution: Seq[Distribution] =
    super.requiredChildDistribution

  override def outputOrdering: Seq[SortOrder] =
    super.outputOrdering

  override protected def doExecute(): RDD[InternalRow] = {

    child.execute().mapPartitionsWithIndex { (partitionId, iter) =>
      val startRow = if (partitionId != 0) partitionRanges(partitionId - 1) + 1 else 0
      val endRow = partitionRanges(partitionId)
      logInfo(s"Processing partition $partitionId: [$startRow, $endRow]")

      new FillerIterator(iter, zero, rowNum, startRow, endRow)
    }
  }
}

private class FillerIterator(iter: Iterator[InternalRow],
                             zero: UnsafeRow,
                             rowNum: Int,
                             startRow: Long,
                             endRow: Long) extends Iterator[InternalRow] {

  private var currentNum: Long = startRow
  private var currentRow: InternalRow = _

  override def hasNext: Boolean = {
    currentNum <= endRow
  }

  override def next(): InternalRow = {
    if (!hasNext) {
      throw new NoSuchElementException()
    }

    if (currentRow == null && iter.hasNext) {
      currentRow = iter.next()
    }

    if (currentRow != null) {
      val rn = currentRow.getDouble(rowNum).toLong
      if (rn == currentNum) {
        val result = currentRow
        currentRow = null
        currentNum += 1
        return result
      }
    }

    zero.setDouble(rowNum, currentNum.toDouble)
    currentNum += 1

    zero
  }
}
