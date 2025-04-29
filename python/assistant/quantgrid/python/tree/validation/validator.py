import libcst as cst
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.exceptions import XLToolError
from quantgrid.python.tree.validation.validation_report import ValidationError


class Validator(matcher.MatcherDecoratableVisitor):
    def __init__(self):
        super().__init__()

        self._errors: list[ValidationError] = []

    def on_error(self, exc_name: str, exc_message: str, code_range: metadata.CodeRange):
        self._errors.append(
            ValidationError(
                exception_name=exc_name,
                exception_message=exc_message,
                code_range=code_range,
            )
        )

    @property
    def errors(self) -> list[ValidationError]:
        return self._errors

    def resolve_position(self, node: cst.CSTNode) -> metadata.CodeRange:
        code_position = self.get_metadata(metadata.PositionProvider, node, None)
        if code_position is None:
            raise XLToolError(f"Cannot resolve code position for {node}.")

        return code_position
