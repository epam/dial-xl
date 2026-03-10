import re

from typing import cast

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.table import Table
from multiset import Multiset
from public import private, public

from dial.xl.assistant.dto.focus import FocusDTO
from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_field_group


@public
def is_table_code_substr(table: Table, substring: str) -> bool:
    return substring in table.to_dsl()


@public
def is_table_code_regex(table: Table, regex: str) -> bool:
    return re.fullmatch(regex, table.to_dsl(), re.DOTALL) is not None


@public
def is_field_code_regex(table: Table, field: Field, regex: str) -> bool:
    field_group = get_field_group(table, field.name)
    return re.fullmatch(regex, field_group.to_dsl(), re.DOTALL) is not None


@public
def get_static_field_values(field: Field) -> list[str]:
    if not isinstance(field.field_data, FieldData):
        message = f"Field '{field.name}' has got no field data."
        raise TypeError(message)

    return field.field_data.values


@public
def are_unsorted_field_values_equal(field: Field, unsorted_values: list[str]) -> bool:
    is_equal = Multiset(get_static_field_values(field)) == Multiset(unsorted_values)
    return cast("bool", is_equal)


@public
def any_unsorted_field_values_equal(table: Table, unsorted_values: list[str]) -> bool:
    return any(
        are_unsorted_field_values_equal(field, unsorted_values)
        for field in iterate_static_fields(table)
    )


@public
def are_unsorted_values_in_table(table: Table, unsorted_values: list[str]) -> bool:
    items: Multiset[str] = Multiset(unsorted_values)

    for field in iterate_static_fields(table):
        for value in get_static_field_values(field):
            items.discard(value, multiplicity=1)

    return len(items) == 0


@public
def is_table_focused(focus: FocusDTO, table: Table) -> bool:
    return any(column.table_name == table.name for column in focus.columns)


@public
def is_field_focused(focus: FocusDTO, table: Table, field: Field) -> bool:
    for column in focus.columns:
        if column.table_name == table.name and column.column_name == field.name:
            return True

    return False


@public
def is_number_in_text(number: str, text: str) -> bool:
    """Tries to find specified number in text.

    Parameters
    ----------
    number : str
        Number to search. Use minimal acceptable precision.
    text: str
        Text to search in.

    Returns
    -------
    bool
        Whether passed number was found in provided text.
    """

    suffixes = [
        (1e9, "B"),
        (1e9, "billion"),
        (1e9, "billions"),
        (1e6, "M"),
        (1e6, "million"),
        (1e6, "millions"),
        (1e3, "K"),
        (1e3, "thousand"),
        (1e3, "thousands"),
        (0.01, "%"),
        (0.01, "percent"),
        (1, None),
    ]

    normalized_target = None
    divider = None
    for d, s in suffixes:
        (target, found) = normalize_number(number, s)
        if found:
            divider = d
            normalized_target = target
            break

    if not normalized_target or not divider:
        message = f"Passed number {number} is not a number."
        raise ValueError(message)

    for d, s in suffixes:
        if divider == d:
            if is_normalized_number_in_text(normalized_target, text, s, None):
                return True
        elif is_normalized_number_in_text(normalized_target, text, s, divider / d):
            return True

    return False


@private
def normalize_number(
    num_str: str, suffix: str | None = None
) -> tuple[str | None, bool]:
    # Remove commas and spaces
    suffix_found = False
    if suffix:
        ret_str = re.sub(r"(?i)\s*" + suffix, "", num_str)
        if ret_str != num_str:
            suffix_found = True
    else:
        ret_str = num_str
        suffix_found = True

    ret_str = ret_str.replace(",", "").replace(" ", "")

    try:
        float(ret_str)
    except ValueError:
        return None, False

    return ret_str, suffix_found


@private
def is_normalized_number_in_text(
    target_number: str,
    text: str,
    suffix: str | None = None,
    divider: float | None = None,
) -> bool:
    # Normalize target number
    target_int_part, *target_split = target_number.split(".")
    target_dec_part = target_split[0] if target_split else ""

    # This pattern finds numbers with optional commas and decimal parts
    pattern = (
        r"(?i)\-?(?:\d+)(?:,\d{3})*(?:\.\d+)?"
        if not suffix
        else r"(?i)\-?(?:\d+)(?:,\d{3})*(?:\.\d+)?(?:\s*)" + suffix
    )
    numbers = re.findall(pattern, text)

    for num in numbers:
        normalized, _ = normalize_number(num, suffix)

        if not normalized:
            continue

        if divider:
            normalized = f"{float(normalized) / divider}"
        int_part, *dec_split = normalized.split(".")
        dec_part = dec_split[0] if dec_split else ""

        # Check integer part must match exactly
        if int_part == target_int_part and dec_part.startswith(target_dec_part):
            return True

        normalized_rounded = (
            round(float(normalized), len(target_dec_part))
            if target_dec_part
            else round(float(normalized))
        )

        if abs(float(target_number) - float(normalized_rounded)) < 1e-8:
            return True

    return False
