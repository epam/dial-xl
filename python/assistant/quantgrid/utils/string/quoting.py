import re

_REGEX = re.compile("[0-9a-zA-Z_]+")


def quote_if_needed(name: str) -> str:
    return name if _REGEX.fullmatch(name) is not None else "'" + name + "'"


def unquote_forced(name: str) -> str:
    if name.startswith("'") or name.startswith('"'):
        name = name[1:]

    if name.endswith("'") or name.endswith('"'):
        name = name[:-1]

    return name


def add_double_quotes(value: str) -> str:
    return '"' + value + '"'
