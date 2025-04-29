from dial_xl.calculate import FieldData
from dial_xl.compile import FieldType


class DynamicField:
    __name: str
    __field_type: FieldType | str | None = None
    __field_data: FieldData | str | None = None

    def __init__(
        self,
        name: str,
        field_type: FieldType | str | None = None,
        field_data: FieldData | str | None = None,
    ):
        self.__name = name
        self.__field_type = field_type
        self.__field_data = field_data

    @property
    def name(self) -> str:
        return self.__name

    @property
    def field_type(self) -> FieldType | str | None:
        return self.__field_type

    @property
    def field_data(self) -> FieldData | str | None:
        return self.__field_data
