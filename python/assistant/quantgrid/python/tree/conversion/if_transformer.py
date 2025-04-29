import textwrap

import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.python.tree.conversion.transformer import Transformer
from quantgrid.python.tree.conversion.utils import statement_utils


class IfTransformer(Transformer):
    METADATA_DEPENDENCIES = (metadata.ParentNodeProvider,)

    _IF = textwrap.dedent(
        """\
        with __if({condition}, locals()):
            {indented_block}
        """
    )

    _IF_EXPR = "__if_expr({condition}, {true_expr}, {false_expr})"

    _RECORD_TRUE_STATE = helper.ensure_type(
        cst.parse_statement("__end_if_block(locals())"), cst.SimpleStatementLine
    )

    _RECORD_FALSE_STATE = helper.ensure_type(
        cst.parse_statement("__end_else_block(locals())"), cst.SimpleStatementLine
    )

    @matcher.leave(matcher.IfExp())
    def if_expression(self, _: cst.IfExp, updated: cst.IfExp) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                self._IF_EXPR,
                self.config,
                condition=updated.test,
                true_expr=updated.body,
                false_expr=updated.orelse,
            ),
            cst.Call,
        )

    @matcher.leave(
        matcher.If(
            orelse=None,
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ParentNodeProvider,
                lambda parent: not isinstance(parent, cst.If),
            ),
        )
    )
    def convert_on_none(self, _: cst.If, updated: cst.If) -> cst.With:
        return self._on_none(updated)

    def _on_none(self, if_node: cst.If) -> cst.With:
        return helper.ensure_type(
            helper.parse_template_statement(
                self._IF,
                self.config,
                condition=if_node.test,
                indented_block=statement_utils.suites_to_indented_block(
                    if_node.body.body,
                    [self._RECORD_TRUE_STATE, self._RECORD_FALSE_STATE],
                ),
            ),
            cst.With,
        )

    @matcher.leave(
        matcher.If(
            orelse=matcher.Else(),
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ParentNodeProvider,
                lambda parent: not isinstance(parent, cst.If),
            ),
        )
    )
    def convert_on_else(self, _: cst.If, updated: cst.If) -> cst.With:
        return self._on_else(updated)

    def _on_else(self, if_node: cst.If) -> cst.With:
        return helper.ensure_type(
            helper.parse_template_statement(
                self._IF,
                self.config,
                condition=if_node.test,
                indented_block=statement_utils.suites_to_indented_block(
                    if_node.body.body,
                    [self._RECORD_TRUE_STATE],
                    helper.ensure_type(if_node.orelse, cst.Else).body.body,
                    [self._RECORD_FALSE_STATE],
                ),
            ),
            cst.With,
        )

    @matcher.leave(
        matcher.If(
            orelse=matcher.If(),
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ParentNodeProvider,
                lambda parent: not isinstance(parent, cst.If),
            ),
        )
    )
    def convert_on_elif(self, _: cst.If, updated: cst.If) -> cst.With:
        return self._on_elif(updated)

    def _on_elif(self, if_node: cst.If) -> cst.With:
        if if_node.orelse is None:
            return self._on_none(if_node)

        if isinstance(if_node.orelse, cst.Else):
            return self._on_else(if_node)

        return helper.ensure_type(
            helper.parse_template_statement(
                self._IF,
                self.config,
                condition=if_node.test,
                indented_block=statement_utils.suites_to_indented_block(
                    if_node.body.body,
                    [self._RECORD_TRUE_STATE],
                    [self._on_elif(helper.ensure_type(if_node.orelse, cst.If))],
                    [self._RECORD_FALSE_STATE],
                ),
            ),
            cst.With,
        )
