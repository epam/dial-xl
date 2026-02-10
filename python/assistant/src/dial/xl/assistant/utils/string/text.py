from public import public


@public
def unify_text(text: str) -> str:
    """Ensures that text contains no newlines at left and exactly one at the end.

    Parameters
    ----------
    text: str
        The text to unify.

    Returns
    -------
    str
        The formatted text.
    """

    return text.strip("\r\n") + "\n"
