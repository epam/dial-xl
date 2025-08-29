import libcst as cst
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.exceptions import XLToolError
from quantgrid.python.tree.validation.validator import Validator


class ScopeValidator(Validator):
    METADATA_DEPENDENCIES = (metadata.ScopeProvider, metadata.PositionProvider)

    _main_scope: metadata.FunctionScope

    def __init__(self):
        super().__init__()

    @matcher.visit(
        matcher.FunctionDef(
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ScopeProvider,
                lambda scope: scope.globals != scope if scope is not None else False,
            )
        )
    )
    def on_nested_function(self, nested_function: cst.FunctionDef):
        scope = self.get_metadata(metadata.ScopeProvider, nested_function.body, None)
        if scope is None:
            raise XLToolError(
                f"Unexpected nested function `{nested_function.name.value}` scope: {type(scope)}"
            )

        self._validate_nested_scope(scope)

    @matcher.visit(
        matcher.Lambda(
            metadata=matcher.MatchMetadataIfTrue(
                metadata.ScopeProvider,
                lambda scope: scope.globals != scope if scope is not None else False,
            )
        )
    )
    def on_lambda(self, lambda_node: cst.Lambda):
        scope = self.get_metadata(metadata.ScopeProvider, lambda_node.body, None)
        if scope is None:
            raise XLToolError(f"Unexpected lambda function scope: {type(scope)}")

        self._validate_nested_scope(scope)

    @staticmethod
    def _resolve_scope_name(scope: metadata.Scope) -> str:
        if isinstance(scope, metadata.FunctionScope) and scope.name is not None:
            return scope.name

        return "<lambda>"

    @staticmethod
    def _resolve_access_name(node: cst.Name | cst.Attribute | cst.BaseString) -> str:
        if isinstance(node, cst.Name):
            return node.value
        elif isinstance(node, cst.Attribute):
            return f".{node.attr.value}"

        return "<unknown>"

    def _validate_nested_scope(self, scope: metadata.Scope):
        for assignment in scope.assignments:
            for assignment_access in assignment.references:
                if assignment_access.scope != scope:
                    code_position = self.resolve_position(assignment_access.node)

                    self.on_error(
                        "DIAL XL Scope Error",
                        f"Nested functions cannot access scope of other nested functions, "
                        f"but `{self._resolve_scope_name(scope)}` "
                        f"variable `{self._resolve_access_name(assignment_access.node)}` "
                        f"is accessed from `{self._resolve_scope_name(assignment_access.scope)}`.",
                        code_position,
                    )
