from pydantic import BaseModel

from dial_xl.compile import PrimitiveFieldType, TableFieldType


def assert_type_equality(
        actual: PrimitiveFieldType | TableFieldType | str | None,
        expected: PrimitiveFieldType | TableFieldType,
        *,
        ignore_hash: bool = True,
) -> None:
    exclude: set[str] = set()
    if ignore_hash:
        exclude.add("hash")

    expected_type_dump = expected.model_dump(exclude=exclude)

    actual_type_dump = (
        actual.model_dump(exclude=exclude)
        if isinstance(actual, BaseModel)
        else actual
    )

    assert expected_type_dump == actual_type_dump
