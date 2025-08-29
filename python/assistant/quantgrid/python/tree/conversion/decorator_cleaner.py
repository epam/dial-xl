import libcst as cst
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer


class DecoratorCleaner(Transformer):
    @matcher.leave(matcher.Decorator())
    def on_function_def(
        self, _: cst.Decorator, __: cst.Decorator
    ) -> cst.RemovalSentinel:
        return cst.RemoveFromParent()
