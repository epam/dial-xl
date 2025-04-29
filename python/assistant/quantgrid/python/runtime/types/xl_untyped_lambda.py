from functools import update_wrapper

from quantgrid.python.runtime.nodes.misc.xl_lambda_enter import XLLambdaEnter
from quantgrid.python.runtime.protocols import FunctionProtocol
from quantgrid.python.runtime.types.base_type import Type
from quantgrid.python.runtime.types.xl_lambda import XLLambda


class XLUntypedLambda[T: Type](XLLambda[T]):
    def __init__(self, wrapped: FunctionProtocol):
        update_wrapper(self, wrapped)
        self._wrapped = wrapped

    def __call__(self, *args: Type, **kwargs: Type) -> T:
        compute_expression: T = self._wrapped(*args, **kwargs)
        return type(compute_expression)(XLLambdaEnter(compute_expression.node))

    def parameter_type(self, index: int) -> type[Type]:
        return Type

    def return_type(self) -> type[Type]:
        return Type

    @property
    def function(self) -> FunctionProtocol:
        return self._wrapped
