import abc

from quantgrid.python.runtime.protocols import FunctionProtocol
from quantgrid.python.runtime.types.base_type import Type


class XLLambda[T: Type](abc.ABC):
    @abc.abstractmethod
    def __call__(self, *args: Type, **kwargs: Type) -> T: ...

    @abc.abstractmethod
    def parameter_type(self, index: int) -> type[Type]: ...

    @abc.abstractmethod
    def return_type(self) -> type[Type]: ...

    @property
    @abc.abstractmethod
    def function(self) -> FunctionProtocol: ...
