import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.python.tree.conversion.transformer import Transformer


class FunctionWrapperTransformer(Transformer):
    METADATA_DEPENDENCIES = (metadata.ScopeProvider,)

    _LAMBDA_TEMPLATE = "__lambda({lambda_expr})"

    @matcher.leave(matcher.Lambda())
    def on_lambda(self, _: cst.Lambda, updated: cst.Lambda) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                FunctionWrapperTransformer._LAMBDA_TEMPLATE,
                self.config,
                lambda_expr=updated,
            ),
            cst.Call,
        )

    @matcher.leave(
        matcher.FunctionDef(
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ScopeProvider,
                lambda scope: scope.globals != scope if scope is not None else False,
            )
        )
    )
    def on_nested_function(
        self, _: cst.FunctionDef, updated: cst.FunctionDef
    ) -> cst.FunctionDef:
        return updated.with_changes(
            decorators=tuple(updated.decorators)
            + (cst.Decorator(cst.Name("__nested_function")),)
        )
