from collections.abc import Collection, Mapping
from textwrap import dedent

from public import public
from tabulate import tabulate

from dial.xl.assistant.utils.string.text import unify_text


@public
def markdown_table(values: Mapping[str, Collection[str | None]]) -> str:
    rendered = tabulate(
        headers="keys",
        showindex=False,
        tablefmt="simple",
        tabular_data=values,
    )

    return unify_text(rendered)


@public
def markdown_code(language: str, code: str) -> str:
    language = language.strip()
    code = dedent(code.strip())
    return f"```{language}\n{code}\n```\n"
