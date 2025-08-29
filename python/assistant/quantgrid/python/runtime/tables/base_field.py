from typing import Iterable, cast

from dial_xl.decorator import Decorator as XLDecorator
from dial_xl.field import Field as XLField

from quantgrid.utils.xl import XLCopier


# TODO[CleanCode][Code Style]: Transit Tables and Fields to attrs library to avoid boilerplate
class BaseField:
    def __init__(
        self,
        *,
        ui_name: str | None = None,
        ui_note: str | None = None,
        formula: str | None = None,
        dim: bool = False,
        key: bool = False,
    ):
        self._xl_field = XLField(ui_name or "")
        self._xl_field_formula = formula or "NA"

        self._xl_field.doc_string = ui_note
        self._xl_field.dim = dim
        self._xl_field.key = key

    @property
    def ui_name(self) -> str:
        return self._xl_field.name

    @ui_name.setter
    def ui_name(self, value: str) -> None:
        self._xl_field.name = value

    @property
    def formula(self) -> str:
        return cast(str, self._xl_field_formula)

    @formula.setter
    def formula(self, value: str) -> None:
        self._xl_field_formula = value

    def reset_formula(self) -> None:
        self._xl_field_formula = "{}" if self.dim else "NA"

    @property
    def ui_note(self) -> str | None:
        return self._xl_field.doc_string

    @ui_note.setter
    def ui_note(self, value: str | None) -> None:
        self._xl_field.doc_string = value

    @property
    def dim(self) -> bool:
        return self._xl_field.dim

    @dim.setter
    def dim(self, value: bool) -> None:
        self._xl_field.dim = value

    @property
    def key(self) -> bool:
        return self._xl_field.key

    @key.setter
    def key(self, value: bool) -> None:
        self._xl_field.key = value

    @property
    def decorators(self) -> Iterable[XLDecorator]:
        return [item for item in self._xl_field.decorators]

    @decorators.setter
    def decorators(self, value: Iterable[XLDecorator]) -> None:
        for decorator_name in list(self._xl_field.decorator_names):
            self._xl_field.remove_decorator(decorator_name)

        for decorator in value:
            self._xl_field.add_decorator(XLCopier.copy_decorator(decorator))

    def as_xl(self) -> XLField:
        return XLCopier.copy_field(self._xl_field)
