import libcst as cst
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer


class ListTransformer(Transformer):
    @matcher.leave(matcher.List())
    def on_list(self, _: cst.List, updated: cst.List) -> cst.Call:
        return cst.Call(
            cst.Name("__array"),
            [cst.Arg(element.value) for element in updated.elements],
        )

    @matcher.leave(matcher.Call(func=matcher.Name("len")))
    def on_len(self, _: cst.Call, updated: cst.Call) -> cst.Call:
        return updated.with_changes(func=cst.Name("__len"))
