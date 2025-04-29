import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher

from quantgrid.python.exceptions import XLInvariantViolation
from quantgrid.python.tree.conversion.transformer import Transformer


class OperatorTransformer(Transformer):
    @matcher.leave(matcher.BooleanOperation())
    def boolean_binary(
        self, _: cst.BooleanOperation, updated: cst.BooleanOperation
    ) -> cst.BinaryOperation:
        return cst.BinaryOperation(
            left=updated.left,
            operator=(
                cst.BitOr() if isinstance(updated.operator, cst.Or) else cst.BitAnd()
            ),
            right=updated.right,
        )

    @matcher.leave(matcher.UnaryOperation(operator=matcher.Not()))
    def boolean_unary(
        self, _: cst.UnaryOperation, updated: cst.UnaryOperation
    ) -> cst.UnaryOperation:
        return updated.with_changes(operator=cst.BitInvert())

    @matcher.leave(matcher.Comparison(comparisons=[matcher.ComparisonTarget()]))
    def in_check(self, _: cst.Comparison, updated: cst.Comparison) -> cst.Call:
        function_name: str
        match updated.comparisons[0].operator:
            case cst.Equal():
                function_name = "__eq"
            case cst.NotEqual():
                function_name = "__ne"

            case cst.GreaterThan():
                function_name = "__gt"
            case cst.LessThan():
                function_name = "__lt"

            case cst.GreaterThanEqual():
                function_name = "__ge"
            case cst.LessThanEqual():
                function_name = "__le"

            case cst.In():
                function_name = "__in"
            case cst.NotIn():
                function_name = "__not_in"

            case cst.Is():
                function_name = "__eq"
            case cst.IsNot():
                function_name = "__ne"

            case _:
                raise XLInvariantViolation(
                    f"Unexpected comparison operator: {updated.comparisons[0].operator}"
                )

        return helper.ensure_type(
            helper.parse_template_expression(
                function_name + "({left_expr}, {right_expr})",
                self.config,
                left_expr=updated.left,
                right_expr=updated.comparisons[0].comparator,
            ),
            cst.Call,
        )
