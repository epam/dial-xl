from typing import Iterable

from dial_xl.events import ObservableObserver, ObservableNode, notify_observer
from dial_xl.reader import _Reader


class _SortFormula:
    __before: str = ""
    __formula: str
    __after: str = "\n"

    def __init__(self, formula: str):
        self.__formula = formula

    def to_dsl(self) -> str:
        """Converts the filter expression to DSL format."""

        return f"{self.__formula}{self.__after}"

    @property
    def formula(self) -> str:
        return self.__formula

    @formula.setter
    def formula(self, value: str):
        self.__formula = value

    @property
    def after(self) -> str:
        return self.__after

    @after.setter
    def after(self, value: str):
        self.__after = value

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_SortFormula":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        result.__formula = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.till_linebreak()

        return result


class ApplySort(ObservableObserver):
    __before: str = ""
    __prefix: str = "sort "
    __formulas: list[_SortFormula]
    __after: str = ""

    def __init__(self):
        self.__formulas = []

    def to_dsl(self) -> str:
        """Converts the sort section to DSL format."""

        return (
            f"{self.__before}"
            f"{self.__prefix}"
            f"{''.join(formula.to_dsl() for formula in self.__formulas)}"
            f"{self.__after}"
        )

    def __len__(self):
        return len(self.__formulas)

    def __getitem__(self, index: int) -> str:
        return self.__formulas[index].formula

    @notify_observer
    def __setitem__(self, index: int, value: str):
        self.__formulas[index].formula = value

    @notify_observer
    def __delitem__(self, index: int):
        formula = self.__formulas.pop(index)
        if index == len(self.__formulas):
            self.__formulas[-1].after = formula.after

    @notify_observer
    def append(self, value: str):
        if self.__formulas:
            self.__formulas[-1].after = ", "

        self.__formulas.append(_SortFormula(value))

    def formulas(self) -> Iterable[str]:
        return (formula.formula for formula in self.__formulas)

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "ApplySort":
        result = cls()
        result.__before = reader.next(lambda d: d["span"]["from"])
        formula_entities = reader.entity.get("formulas", [])
        result.__prefix = (
            reader.next(formula_entities[0]["span"]["from"])
            if formula_entities
            else reader.next(lambda d: d["span"]["to"])
        )
        for formula_entity in formula_entities:
            formula_reader = reader.with_entity(formula_entity)
            formula = _SortFormula._deserialize(formula_reader)
            result.__formulas.append(formula)
            reader.position = formula_reader.position
        result.__after = reader.before_next()

        return result


class ApplyFilter(ObservableNode):
    __before: str = ""
    __prefix: str = "filter "
    __formula: str
    __after: str = "\n"

    def __init__(self, formula: str):
        self.__formula = formula

    def to_dsl(self) -> str:
        """Converts the filter section to DSL format."""

        return f"{self.__before}{self.__prefix}{self.__formula}{self.__after}"

    @property
    def formula(self) -> str:
        return self.__formula

    @formula.setter
    @notify_observer
    def formula(self, value: str):
        self.__formula = value

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "ApplyFilter":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        formula_entity = reader.entity.get("formula")
        if formula_entity:
            result.__prefix = reader.next(formula_entity["span"]["from"])
            result.__formula = reader.next(formula_entity["span"]["to"])
        else:
            result.__prefix = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.before_next()

        return result


class Apply(ObservableObserver):
    __before: str = ""
    __prefix: str = "apply\n"
    __operations: list[ApplySort | ApplyFilter]
    __after: str = ""
    __sort_index: int | None = None
    __filter_index: int | None = None

    def __init__(self):
        self.__operations = []

    def to_dsl(self) -> str:
        """Converts the apply section to DSL format."""

        return (
            f"{self.__before}"
            f"{self.__prefix}"
            f"{''.join(operation.to_dsl() for operation in self.__operations)}"
            f"{self.__after}"
        )

    @property
    def sort(self) -> ApplySort | None:
        return (
            self.__operations[self.__sort_index]
            if self.__sort_index is not None
            else None
        )

    @sort.setter
    @notify_observer
    def sort(self, value: ApplySort | None):
        self.__sort_index = self._set_indexed_node(
            value, self.__operations, self.__sort_index
        )

    @property
    def filter(self) -> ApplyFilter | None:
        return (
            self.__operations[self.__filter_index]
            if self.__filter_index is not None
            else None
        )

    @filter.setter
    @notify_observer
    def filter(self, value: ApplyFilter | None):
        self.__filter_index = self._set_indexed_node(
            value, self.__operations, self.__filter_index
        )

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Apply":
        result = cls()
        result.__before = reader.next(lambda d: d["span"]["from"])
        sort_entity = reader.entity.get("sort")
        filter_entity = reader.entity.get("filter")
        operation_entities = []
        if sort_entity:
            operation_entities.append(sort_entity)
        if filter_entity:
            operation_entities.append(filter_entity)
        # sort and filter operations can be written in any order
        operation_entities.sort(key=lambda d: d["span"]["from"])
        result.__prefix = (
            reader.next(operation_entities[0]["span"]["from"])
            if operation_entities
            else reader.next(lambda d: d["span"]["to"])
        )
        for operation_entity in operation_entities:
            if operation_entity == sort_entity:
                sort_reader = reader.with_entity(sort_entity)
                sort = ApplySort._deserialize(sort_reader)
                result.__sort_index = len(result.__operations)
                result.__operations.append(sort)
                sort._attach(result)
                reader.position = sort_reader.position
            if operation_entity == filter_entity:
                filter_reader = reader.with_entity(filter_entity)
                fi1ter = ApplyFilter._deserialize(filter_reader)
                result.__filter_index = len(result.__operations)
                result.__operations.append(fi1ter)
                fi1ter._attach(result)
                reader.position = filter_reader.position
        result.__after = reader.before_next()

        return result
