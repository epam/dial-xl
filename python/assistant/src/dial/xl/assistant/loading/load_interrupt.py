from typing import TYPE_CHECKING, Any

from public import public

from dial.xl.assistant.graph.interrupts import AnyInterruptRequest

if TYPE_CHECKING:
    from langgraph.types import Interrupt


@public
def load_interrupt(output: dict[str, Any]) -> AnyInterruptRequest | None:
    if (interrupts := output.get("__interrupt__")) is None:
        return None

    # We don't support more than one interrupt a time
    # (i.e. 2 interrupts in parallel branches)
    assert len(interrupts) == 1
    interrupt: Interrupt = interrupts[0]

    if isinstance(value := interrupt.value, AnyInterruptRequest):
        return value

    message = "Unknown interruption format"
    raise ValueError(message)
