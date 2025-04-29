import libcst as cst
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.python.tree.validation.validator import Validator


class ConditionalDefValidator(Validator):
    METADATA_DEPENDENCIES = (metadata.PositionProvider,)

    @matcher.call_if_inside(matcher.If())
    @matcher.visit(matcher.FunctionDef())
    def on_def(self, def_node: cst.FunctionDef):
        code_position = self.resolve_position(def_node.params)

        self.on_error(
            "DIAL XL Functionality Error",
            "DIAL XL does not support conditional function definition.",
            code_position,
        )
