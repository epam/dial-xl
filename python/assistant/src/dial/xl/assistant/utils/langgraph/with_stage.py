import inspect
import time

from collections.abc import Awaitable, Callable
from functools import wraps
from inspect import Parameter, Signature
from typing import Any, Concatenate, Protocol, cast, get_origin

from aidial_sdk.chat_completion import Stage, Status
from langgraph.errors import GraphInterrupt
from langgraph.prebuilt import ToolRuntime
from langgraph.runtime import Runtime
from public import private, public

from dial.xl.assistant.graph.context import Context


@public
def with_stage[**P, R](
    name: str,
) -> Callable[
    [Callable[Concatenate[Stage, P], Awaitable[R]]], Callable[P, Awaitable[R]]
]:
    """Inject DIAL Stage as first function argument.

    Parameters
    ----------
    name : str
        Created stage name.

    Notes
    -----
    * Wrapped function must specify Stage parameter as first positional.
    * Only async functions are supported at the moment.
    * @tool-decorated functions are also supported.
      @tool decorator must be applied after (higher than) @with_stage decorator.
    """

    def create_wrapper(
        func: Callable[Concatenate[Stage, P], Awaitable[R]],
    ) -> Callable[P, Awaitable[R]]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            context = fetch_context(*args, **kwargs)

            status = Status.COMPLETED
            with context.choice.create_stage(name) as stage:
                timer_start = time.perf_counter()

                try:
                    func_output = await func(stage, *args, **kwargs)
                except GraphInterrupt:
                    raise
                except Exception:
                    status = Status.FAILED
                    raise
                finally:
                    finalize_stage(stage, status, timer_start)

            return func_output

        wrapped = cast("FunctionProtocol", cast("object", wrapper))

        signature = inspect.signature(wrapper)
        annotations = inspect.get_annotations(wrapper)

        wrapped.__signature__ = fix_signature(signature)
        wrapped.__annotations__ = fix_annotations(annotations)

        return wrapper

    return create_wrapper


@private
class FunctionProtocol(Protocol):
    __signature__: inspect.Signature
    __annotations__: dict[str, Any]


@private
def fix_signature(signature: Signature) -> Signature:
    fixed_parameters: list[Parameter] = []

    for param in signature.parameters.values():
        annotation = param.annotation
        if annotation is None:
            message = "Non-annotated parameter found in @with_stage decorated function."
            raise ValueError(message)

        origin = get_origin(annotation) or annotation
        if isinstance(origin, type) and issubclass(origin, Stage):
            continue

        fixed_parameters.append(param)

    return signature.replace(parameters=fixed_parameters)


@private
def fix_annotations(annotations: dict[str, Any]) -> dict[str, Any]:
    fixed_annotations: dict[str, Any] = {}

    for name, annotation in annotations.items():
        if name == "return":
            fixed_annotations[name] = annotation

        origin = get_origin(annotation) or annotation
        if isinstance(origin, type) and issubclass(origin, Stage):
            continue

        fixed_annotations[name] = annotation

    return fixed_annotations


@private
def fetch_context(*args: Any, **kwargs: Any) -> Context:
    for value in args:
        if isinstance(value, Runtime | ToolRuntime):
            return cast("Context", value.context)

    for value in kwargs.values():
        if isinstance(value, Runtime | ToolRuntime):
            return cast("Context", value.context)

    message = "No Runtime parameter found."
    raise ValueError(message)


@private
def finalize_stage(stage: Stage, _: Status, timer_start: float) -> None:
    timer_end = time.perf_counter()

    time_elapsed = timer_end - timer_start
    stage.append_name(f" [{time_elapsed:.1f}s.]")

    # TODO: There is a bug inside aidial_sdk,
    #  which double-closes stage in case of exception.
    #  I'll handle it.
    # stage.close(status)
