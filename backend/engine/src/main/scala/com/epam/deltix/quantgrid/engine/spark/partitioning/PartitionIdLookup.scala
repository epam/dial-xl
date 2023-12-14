package com.epam.deltix.quantgrid.engine.spark.partitioning

import org.apache.spark.sql.catalyst.analysis.TypeCheckResult
import org.apache.spark.sql.catalyst.expressions.codegen.{CodeGenerator, CodegenContext, ExprCode}
import org.apache.spark.sql.catalyst.expressions.{BinaryExpression, Expression, ExpressionDescription, ImplicitCastInputTypes, NullIntolerant}
import org.apache.spark.sql.catalyst.util.{ArrayData, TypeUtils}
import org.apache.spark.sql.types.{ArrayType, DataType, LongType}

@ExpressionDescription(
  usage =
    """
    _FUNC_(lastRowArray, rowNumber) - Searches partition id for a specified rowNumber.
    lastRowArray is an array where each element represents upper border of a partition range
    See org.apache.spark.sql.catalyst.expressions.ArrayPosition
  """,
  examples =
    """
    Examples:
      > SELECT _FUNC_(array(1, 5, 8), 0);
        0
      > SELECT _FUNC_(array(1, 5, 8), 3);
        1
      > SELECT _FUNC_(array(1, 5, 8), 8);
        2
  """,
  group = "array_funcs"
)
case class PartitionIdLookup(left: Expression, right: Expression)
  extends BinaryExpression with ImplicitCastInputTypes with NullIntolerant {

  @transient private lazy val ordering: Ordering[Any] =
    TypeUtils.getInterpretedOrdering(right.dataType)

  override def dataType: DataType = LongType

  override def inputTypes: Seq[DataType] = {
    Seq(ArrayType(LongType, containsNull = false), LongType)
  }

  override def checkInputDataTypes(): TypeCheckResult = {
    TypeUtils.checkForOrderingExpr(dataType, s"function $prettyName")
  }

  override def nullSafeEval(arr: Any, value: Any): Any = {
    arr.asInstanceOf[ArrayData].foreach(right.dataType, (i, v) =>
      if (ordering.lteq(v, value)) {
        return i
      }
    )
    -1
  }

  override def prettyName: String = "array_search"

  override def doGenCode(ctx: CodegenContext, ev: ExprCode): ExprCode = {
    nullSafeCodeGen(ctx, ev, (arr, value) => {
      val partId = ctx.freshName("partId")
      val len = ctx.freshName("len")
      val i = ctx.freshName("i")
      val arrData = ctx.freshName("arr")
      val getValue = CodeGenerator.getValue(arrData, right.dataType, i)
      s"""
         |int $partId = -1;
         |ArrayData $arrData = $arr;
         |int $len = $arrData.numElements();
         |for (int $i = 0; $i < $len; $i++) {
         |  if ($value <= $getValue) {
         |    $partId = $i;
         |    break;
         |  }
         |}
         |${ev.value} = $partId;
       """.stripMargin
    })
  }

  override protected def withNewChildrenInternal(newLeft: Expression, newRight: Expression): Expression =
    copy(left = newLeft, right = newRight)
}
