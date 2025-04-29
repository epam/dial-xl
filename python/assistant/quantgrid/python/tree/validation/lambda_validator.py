import libcst as cst
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.exceptions import XLToolError
from quantgrid.python.tree.validation.validator import Validator


class LambdaValidator(Validator):
    METADATA_DEPENDENCIES = (metadata.PositionProvider,)

    @matcher.visit(matcher.Lambda())
    def on_lambda(self, lambda_node: cst.Lambda):
        code_position = self.get_metadata(metadata.PositionProvider, lambda_node, None)
        if code_position is None:
            raise XLToolError(f"Cannot resolve code position for {lambda_node}.")

        self.on_error(
            "DIAL XL Functionality Error",
            "Lambdas are not supported in DIAL XL Framework.",
            code_position,
        )
