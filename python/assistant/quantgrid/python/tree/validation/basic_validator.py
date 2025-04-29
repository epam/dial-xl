import libcst as cst
import libcst.matchers as matcher
import libcst.metadata as metadata

from quantgrid.python.tree.validation.validator import Validator


class BasicValidator(Validator):
    METADATA_DEPENDENCIES = (metadata.PositionProvider,)

    @matcher.visit(matcher.Tuple())
    def on_tuple(self, tuple_node: cst.Tuple):
        code_position = self.resolve_position(tuple_node)

        self.on_error(
            "DIAL XL Functionality Error", "Tuples are not supported.", code_position
        )

    @matcher.visit(matcher.Dict())
    def on_dict(self, dict_node: cst.Dict):
        code_position = self.resolve_position(dict_node)

        self.on_error(
            "DIAL XL Functionality Error",
            "Dictionaries are not supported.",
            code_position,
        )

    @matcher.visit(matcher.Set())
    def on_set(self, set_node: cst.Set):
        code_position = self.resolve_position(set_node)

        self.on_error(
            "DIAL XL Functionality Error", "Sets are not supported.", code_position
        )

    @matcher.visit(matcher.GeneratorExp())
    @matcher.visit(matcher.ListComp())
    @matcher.visit(matcher.SetComp())
    @matcher.visit(matcher.DictComp())
    def on_comprehension(self, comp_node: cst.BaseComp):
        code_position = self.resolve_position(comp_node)

        self.on_error(
            "DIAL XL Functionality Error",
            "Comprehensions are not supported.",
            code_position,
        )

    @matcher.visit(matcher.For())
    @matcher.visit(matcher.While())
    def on_cycle(self, cycle_node: cst.For | cst.While):
        code_position = self.resolve_position(
            cycle_node.test if isinstance(cycle_node, cst.While) else cycle_node.iter
        )

        self.on_error(
            "DIAL XL Functionality Error",
            "Cycles (for / while) are not supported.",
            code_position,
        )
