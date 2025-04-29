import libcst as cst
import libcst.helpers as helper
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer


class LiteralTransformer(Transformer):
    _INTEGER_TEMPLATE = "__int({expr})"
    _FLOAT_TEMPLATE = "__float({expr})"
    _STR_TEMPLATE = "__str({expr})"
    _F_STR_TEMPLATE = "__f_str({expr})"
    _BOOL_TEMPLATE = "__bool({expr})"

    @matcher.leave(matcher.Integer())
    def on_integer(self, _: cst.Integer, updated: cst.Integer) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                LiteralTransformer._INTEGER_TEMPLATE,
                self.config,
                expr=cst.SimpleString(f"'{updated.value}'"),
            ),
            cst.Call,
        )

    @matcher.leave(matcher.Float())
    def on_float(self, _: cst.Float, updated: cst.Float) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                LiteralTransformer._FLOAT_TEMPLATE,
                self.config,
                expr=cst.SimpleString(f"'{updated.value}'"),
            ),
            cst.Call,
        )

    @matcher.leave(matcher.SimpleString())
    def on_str(self, _: cst.SimpleString, updated: cst.SimpleString) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                LiteralTransformer._STR_TEMPLATE, self.config, expr=updated
            ),
            cst.Call,
        )

    @matcher.leave(matcher.Name("True") | matcher.Name("False"))
    def on_bool(self, _: cst.Name, updated: cst.Name) -> cst.Call:
        return helper.ensure_type(
            helper.parse_template_expression(
                LiteralTransformer._BOOL_TEMPLATE, self.config, expr=updated
            ),
            cst.Call,
        )

    @matcher.leave(matcher.FormattedString())
    def on_formatted_str(
        self, _: cst.FormattedString, updated: cst.FormattedString
    ) -> cst.BaseExpression:
        parts: list[cst.BaseExpression] = []

        for part in updated.parts:
            if isinstance(part, cst.FormattedStringText):
                parts.append(
                    helper.ensure_type(
                        helper.parse_template_expression(
                            LiteralTransformer._STR_TEMPLATE,
                            self.config,
                            expr=cst.SimpleString(
                                f"{updated.end}{part.value}{updated.end}"
                            ),
                        ),
                        cst.Call,
                    )
                )
            elif isinstance(part, cst.FormattedStringExpression):
                parts.append(
                    helper.ensure_type(
                        helper.parse_template_expression(
                            LiteralTransformer._F_STR_TEMPLATE,
                            self.config,
                            expr=part.expression,
                        ),
                        cst.Call,
                    )
                )

        if not parts:
            return cst.SimpleString("''")

        combined_expr = parts[0]
        for formatted_part in parts[1:]:
            combined_expr = cst.BinaryOperation(
                left=combined_expr, operator=cst.Add(), right=formatted_part
            )

        return combined_expr.with_changes(
            lpar=[cst.LeftParen()], rpar=[cst.RightParen()]
        )
