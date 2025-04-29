import re

from testing.framework.exceptions import MatchingError


def assert_contain_substring(string: str, substrings: str | list[str] | None = None):
    if substrings is None:
        return

    if isinstance(substrings, str):
        substrings = [substrings]

    for substring in substrings:
        if substring not in string:
            raise MatchingError(f'Substring "{substring}" not found in "{string}"')


def assert_contain_substrings(
    strings: list[str], substrings: list[str | list[str] | None]
):
    for string, substring in zip(strings, substrings):
        assert_contain_substring(string, substring)


def assert_regex_match(string: str, regex: str | None = None):
    if regex is None:
        return

    if re.fullmatch(regex, string, re.DOTALL) is None:
        raise MatchingError(f'Regex "{regex}" not found in "{string}"')


def assert_regexes_matches(strings: list[str], regex: list[str | None]):
    for string, regex_item in zip(strings, regex):
        assert_regex_match(string, regex_item)


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
        return ret_str, suffix_found
    except ValueError:
        return None, False


# def collect_number_regexes(number: float | None = None):
def _is_number_in_text(
    target_number: str,
    text_body: str,
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
    numbers = re.findall(pattern, text_body)

    for num in numbers:
        normalized, ignored = normalize_number(num, suffix)

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


def is_number_in_text(number_str: str, text_body: str) -> bool:
    """
    Tries to find specified number in text

      number_str
        Number to search. Use minimal acceptable precision

      text_body
        Text to search in
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
        (target, found) = normalize_number(number_str, s)
        if found:
            divider = d
            normalized_target = target
            break

    if not normalized_target or not divider:
        raise ValueError("number_str is not a number")

    for d, s in suffixes:
        if divider == d:
            if _is_number_in_text(normalized_target, text_body, s, None):
                return True
        elif _is_number_in_text(normalized_target, text_body, s, divider / d):
            return True

    return False


# def test_is_number_in_text():
def validating_is_number_in_text():
    # Test cases
    tests: list[tuple[str, str, bool]] = [
        ("1", "The value is 0.9", True),
        ("2.15369", "The value is 2.153692460489330", True),
        ("2.15369", "The value is 2.153692460489330", True),
        ("2.15370", "The value is 2.153692460489330", False),
        ("2.4345", "The value is 2.153692460489330 ", False),
        ("2.15", "The value is 2.153692460489330", True),
        ("2", "The value is 2.153692460489330", True),
        ("2.2", "The value is 2.153692460489330", True),
        ("2.15469", "The value is 2.153692460489330", False),
        ("2.16370", "The value is 2.153692460489330", False),
        ("3", "The value is 2.553692460489330", True),
        ("4", "The value is 2.553692460489330", False),
        ("1234.56", "The cost is 1,234.56", True),
        ("1,234.56", "The cost is 1,234.56", True),
        ("1,234.560", "The cost is 1,234.56", True),
        ("1,235", "The cost is 1,234.56", True),
        ("10", "The price is 9.99", True),
        ("9.9", "The price is 9.99", True),
        ("10.0", "The price is 9.99", True),
        ("-2", "The value is -1.5", True),
        ("-1", "The value is -1.5", True),
        ("-1.4", "The value is -1.5", False),
        ("3 thousand", "The value is 3,123", True),
        ("3 millions", "The value is 3,123 thousands", True),
        ("3 millions", "The value is 3,923 thousands", True),  # truncated
        ("3.3 millions", "The value is 3,423 thousands", False),
        ("3.1 thousand", "The value is 3,123", True),
        ("3.1 millions", "The value is 3,123 thousands", True),
        ("3.2 thousand", "The value is 3,123", False),
        ("3.2 millions", "The value is 3,123 thousands", False),
        ("1.2 percent", "The value is 1.23%", True),
        ("1.2 percent", "The value is 0.012", True),
        ("57%", "revenue was 57.09% ", True),
        ("57%", "revenue was 0.57 ", True),
        ("56%", "revenue was 55.99% ", True),
        ("56%", "revenue was 0.56 ", True),
        ("56.0%", "revenue was 55.49% ", False),
        ("-1.95%", "YoY Change: -1.95% ", True),
        ("-1.952%", "YoY Change: -1.95% ", False),
        ("-1.95%", "YoY Change: -0.0195 ", True),
        ("1.95%", "YoY Change: -1.95% ", False),
    ]

    for target, text, expected in tests:
        result = is_number_in_text(target, text)
        if result != expected:
            is_number_in_text(target, text)

        assert result == expected

    print("Success")
