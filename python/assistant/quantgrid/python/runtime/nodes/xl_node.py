from abc import abstractmethod
from typing import Callable


# TODO[Generation Quality][Python Code]: Find repeating sub-graphs and create additional misc fields in resulting table.
#  This will help to reduce code clutter and size.
class XLNode:
    @property
    @abstractmethod
    def children(self) -> tuple["XLNode", ...]: ...

    @property
    def code(self) -> str:
        return " ".join((child.code for child in self.children))

    def search_by(self, predicate: Callable[["XLNode"], bool]) -> tuple["XLNode", ...]:
        search = (self,) if predicate(self) else tuple()
        for child in self.children:
            search += child.search_by(predicate)

        return search

    def __str__(self) -> str:
        return self.code
