from typing import cast

import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer
from quantgrid.python.tree.conversion.utils import statement_utils


class ReturnTransformer(Transformer):
    _INIT_TEMPLATE = "__return = __enter({annotation})"
    _IF_RETURN_TEMPLATE = "__return = {expression}"
    _FINISH_TEMPLATE = "__return = __on_return(__return, {expression})"

    @matcher.leave(matcher.FunctionDef(returns=matcher.Annotation()))
    def on_function_def(
        self, _: cst.FunctionDef, updated: cst.FunctionDef
    ) -> cst.FunctionDef:
        return updated.with_changes(
            body=statement_utils.suites_to_indented_block(
                [
                    helper.parse_template_statement(
                        self._INIT_TEMPLATE,
                        self.config,
                        annotation=cast(cst.Annotation, updated.returns).annotation,
                    )
                ],
                updated.body.body,
                [cst.parse_statement("return __return", self.config)],
            )
        )

    @matcher.call_if_inside(matcher.If())
    @matcher.leave(matcher.Return())
    def on_if_return(self, _: cst.Return, updated: cst.Return) -> cst.Assign:
        return cst.ensure_type(
            cst.ensure_type(
                helper.parse_template_statement(
                    self._IF_RETURN_TEMPLATE,
                    self.config,
                    expression=cast(cst.BaseExpression, updated.value),
                ),
                cst.SimpleStatementLine,
            ).body[0],
            cst.Assign,
        )

    @matcher.call_if_not_inside(matcher.If())
    @matcher.leave(matcher.Return())
    def on_main_return(self, _: cst.Return, updated: cst.Return) -> cst.Assign:
        return cst.ensure_type(
            cst.ensure_type(
                helper.parse_template_statement(
                    self._FINISH_TEMPLATE,
                    self.config,
                    expression=cast(cst.BaseExpression, updated.value),
                ),
                cst.SimpleStatementLine,
            ).body[0],
            cst.Assign,
        )
