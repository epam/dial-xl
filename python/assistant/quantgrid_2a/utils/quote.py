import re

_regex = re.compile("[0-9a-zA-Z_]+")


def quote_if_needed(name: str) -> str:
    return name if _regex.fullmatch(name) is not None else "'" + name + "'"


def unquote_forced(name: str) -> str:
    if name.startswith("'"):
        name = name[1:]

    if name.endswith("'"):
        name = name[:-1]

    return name
