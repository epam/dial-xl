import libcst as cst
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer


class IfContextTransformer(Transformer):
    _RESTORE_STATE = "{variables} = __else({names})"
    _UPDATE_STATE = "{variables} = __endif({names})"

    class IfScope:
        current_variables: set[str]

        def __init__(self):
            self.true_variables: set[str] = set()
            self.false_variables: set[str] = set()

    def __init__(self, config: cst.PartialParserConfig):
        super().__init__(config)
        self._scopes: list[IfContextTransformer.IfScope] = []

    @matcher.visit(
        matcher.With(
            items=[matcher.WithItem(item=matcher.Call(func=matcher.Name(value="__if")))]
        )
    )
    def on_if_visit(self, _: cst.With) -> None:
        scope = IfContextTransformer.IfScope()
        scope.current_variables = scope.true_variables

        self._scopes.append(scope)

        return None

    @matcher.leave(
        matcher.With(
            items=[matcher.WithItem(item=matcher.Call(func=matcher.Name(value="__if")))]
        )
    )
    def on_if_exit(self, _: cst.With, updated: cst.With) -> cst.With:
        scope = self._scopes.pop()

        if len(self._scopes):
            self._scopes[-1].current_variables |= (
                scope.true_variables | scope.false_variables
            )

        return updated

    @matcher.leave(
        matcher.SimpleStatementLine(
            body=[
                matcher.Expr(
                    value=matcher.Call(func=matcher.Name(value="__end_if_block"))
                )
            ]
        )
    )
    def on_restore_state(
        self, _: cst.SimpleStatementLine, expression: cst.SimpleStatementLine
    ):
        variables = list(self._scopes[-1].true_variables)
        self._scopes[-1].current_variables = self._scopes[-1].false_variables

        if not len(variables):
            return expression

        return cst.FlattenSentinel(
            [
                expression,
                cst.parse_statement(
                    self._RESTORE_STATE.format(
                        variables=", ".join(variables) + ",",
                        names=", ".join((f"'{variable}'" for variable in variables)),
                    )
                ),
            ]
        )

    @matcher.leave(
        matcher.SimpleStatementLine(
            body=[
                matcher.Expr(
                    value=matcher.Call(func=matcher.Name(value="__end_else_block"))
                )
            ]
        )
    )
    def on_update_state(
        self, _: cst.SimpleStatementLine, expression: cst.SimpleStatementLine
    ):
        variables = list(
            self._scopes[-1].true_variables | self._scopes[-1].false_variables
        )
        self._scopes[-1].current_variables = set()

        if not len(variables):
            return expression

        return cst.FlattenSentinel(
            [
                expression,
                cst.parse_statement(
                    self._UPDATE_STATE.format(
                        variables=", ".join(variables) + ",",
                        names=", ".join((f"'{variable}'" for variable in variables)),
                    )
                ),
            ]
        )

    @matcher.leave(matcher.AnnAssign(target=matcher.Name()))
    def on_annotated_assign(
        self, _: cst.AnnAssign, updated: cst.AnnAssign
    ) -> cst.AnnAssign:
        if len(self._scopes):
            self._scopes[-1].current_variables.add(
                cst.ensure_type(updated.target, cst.Name).value
            )

        return updated

    @matcher.leave(matcher.AssignTarget(target=matcher.Name()))
    def on_assign(
        self, _: cst.AssignTarget, updated: cst.AssignTarget
    ) -> cst.AssignTarget:
        if len(self._scopes):
            self._scopes[-1].current_variables.add(
                cst.ensure_type(updated.target, cst.Name).value
            )

        return updated
