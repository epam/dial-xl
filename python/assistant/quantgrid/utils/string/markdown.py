import tabulate


def code_snippet(language: str, code: str) -> str:
    return f"```{language}\n" + code.strip("\r\n") + "\n```\n"


def markdown_table(
    name: str, data: dict[str, list[str]], total_rows: int | None = None
) -> str:
    markdown = tabulate.tabulate(
        data,
        headers="keys",
        tablefmt="pipe",
        numalign="decimal",
        stralign="left",
        missingval="?",
    )

    if total_rows:
        visible_rows = max([len(d) for d in data.values()])
        return f"Sample data for table **{name}** ({visible_rows}/{total_rows} rows)\n\n{markdown}\n"
    else:
        return f"**{name}**\n\n{markdown}\n"
