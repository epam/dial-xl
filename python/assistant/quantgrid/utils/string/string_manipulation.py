import keyword
import re

import humps

_NON_VARIABLE = r"[^a-zA-Z0-9_]"
_UNESCAPE_NEWLINES = r"\\n"
_UNESCAPE_TICKS = r"\\\'"
_UNESCAPE_QUOTES = r'\\"'
_UNDERSCORES = r"_+"


def pythonize(text: str) -> str:
    text = re.sub(_NON_VARIABLE, "_", text).strip("_")

    if len(text) and not text[0].isalpha():
        text = "_" + text

    if not len(text):
        text = "_"

    if keyword.iskeyword(text):
        text += "_"

    return re.sub(_UNDERSCORES, "_", text)


def snake_case(text: str) -> str:
    snaked = humps.depascalize(pythonize(text))
    return re.sub(_UNDERSCORES, "_", snaked)


def camelcase(text: str) -> str:
    camel = humps.pascalize(pythonize(text))
    return re.sub(_UNDERSCORES, "_", camel)


def unescape_newlines(text: str) -> str:
    escaped = re.sub(_UNESCAPE_NEWLINES, "\n", text)
    escaped = re.sub(_UNESCAPE_TICKS, "'", escaped)
    escaped = re.sub(_UNESCAPE_QUOTES, '"', escaped)
    return escaped
