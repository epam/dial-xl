import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher

from libcst.matchers import (
    BinaryOperation,
    BooleanOperation,
    Comparison,
    UnaryOperation,
)

from quantgrid.python.tree.conversion.transformer import Transformer


class ParenthesisTransformer(Transformer):
    _PARENTHESIS_TEMPLATE = "__parenthesis({expr})"

    @matcher.leave(
        UnaryOperation(lpar=[matcher.AtLeastN(n=1)], rpar=[matcher.AtLeastN(n=1)])
    )
    @matcher.leave(
        BinaryOperation(lpar=[matcher.AtLeastN(n=1)], rpar=[matcher.AtLeastN(n=1)])
    )
    @matcher.leave(
        BooleanOperation(lpar=[matcher.AtLeastN(n=1)], rpar=[matcher.AtLeastN(n=1)])
    )
    @matcher.leave(
        Comparison(lpar=[matcher.AtLeastN(n=1)], rpar=[matcher.AtLeastN(n=1)])
    )
    def on_parenthesis(
        self, _: cst.BaseExpression, updated: cst.BaseExpression
    ) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                ParenthesisTransformer._PARENTHESIS_TEMPLATE,
                self.config,
                expr=updated.with_changes(lpar=[], rpar=[]),
            ),
            cst.Call,
        )

    @matcher.leave(matcher.AnnAssign(value=matcher.BaseExpression()))
    @matcher.leave(matcher.Assign())
    def on_assign(
        self, _: cst.BaseSmallStatement, updated: cst.AnnAssign | cst.Assign
    ) -> cst.BaseSmallStatement:
        value_expression = updated.value
        if value_expression is None:
            return updated

        return updated.with_changes(
            value=helper.ensure_type(
                helper.parse_template_expression(
                    ParenthesisTransformer._PARENTHESIS_TEMPLATE,
                    self.config,
                    expr=value_expression,
                ),
                cst.Call,
            )
        )
