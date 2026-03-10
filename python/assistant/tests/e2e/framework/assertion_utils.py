import re

from public import public

from tests.e2e.exceptions.matching_error import ExpectedActionAssertionError


@public
def assert_contain_substring(
    string: str, substrings: str | list[str] | None = None
) -> None:
    if substrings is None:
        return

    if isinstance(substrings, str):
        substrings = [substrings]

    for substring in substrings:
        if substring not in string:
            message = f"Substring '{substring}' not found in '{string}'."
            raise ExpectedActionAssertionError(message)


@public
def assert_contain_substrings(
    strings: list[str], substrings: list[str | list[str] | None]
) -> None:
    for string, substring in zip(strings, substrings, strict=False):
        assert_contain_substring(string, substring)


@public
def assert_regex_match(string: str, regex: str | None = None) -> None:
    if regex is None:
        return

    if re.fullmatch(regex, string, re.DOTALL) is None:
        message = f"Regex '{regex}' not found in '{string}'."
        raise ExpectedActionAssertionError(message)


@public
def assert_regexes_matches(strings: list[str], regex: list[str | None]) -> None:
    for string, regex_item in zip(strings, regex, strict=False):
        assert_regex_match(string, regex_item)
