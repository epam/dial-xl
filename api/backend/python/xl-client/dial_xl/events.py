import functools
import inspect
from abc import ABC

from dial_xl.utils import ImmutableModel


class Event(ImmutableModel):
    method_name: str
    kwargs: dict

    @property
    def sender(self) -> "ObservableNode":
        return self.kwargs["self"]


class Observer(ABC):
    """Used to receive notifications about modifications to child nodes.
    Corresponding parent nodes apply validations to changes. E.g. to check naming conflicts.
    A project or a computation unit should invalidate compilation/computation results on changes.
    """

    def _notify_before(self, event: Event):
        pass

    def _notify_after(self, event: Event):
        pass


class ObservableNode(ABC):
    """Used to propagate modifications to parent nodes.
    E.g. when a field is renamed, the parent table should be notified to update mapping.
    """

    _observer: Observer | None = None

    def _attach(self, observer: Observer):
        if self._observer:
            raise ValueError(
                f"{type(self).__name__} is already attached to a parent"
            )

        self._observer = observer

    def _detach(self):
        if not self._observer:
            raise ValueError(
                f"{type(self).__name__} is not attached to a parent"
            )

        self._observer = None


class ObservableObserver(Observer, ObservableNode):
    """A convenience class for observers that are also observable nodes."""

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

    def _notify_after(self, event: Event):
        if self._observer:
            self._observer._notify_after(event)


def notify_observer(func):
    @functools.wraps(func)
    def wrapper(self: ObservableNode, *args, **kwargs):
        event: Event | None = None
        if self._observer:
            bound_args = inspect.signature(func).bind(self, *args, **kwargs)
            bound_args.apply_defaults()
            event = Event(
                method_name=func.__name__, kwargs=bound_args.arguments
            )
            self._observer._notify_before(event)
        result = func(self, *args, **kwargs)
        if self._observer:
            self._observer._notify_after(event)
        return result

    return wrapper
