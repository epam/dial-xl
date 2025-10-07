import tabulate


def code_snippet(language: str, code: str) -> str:
    return f"```{language}\n" + code.strip("\r\n") + "\n```\n"


def markdown_table(
    name: str,
    data: dict[str, list[str]],
    total_rows: int | None = None,
    include_warning: bool = False,
) -> str:
    visible_rows = [len(d) for d in data.values()]
    visible_rows_number = max(visible_rows) if visible_rows else 0
    data_with_add = {}
    if total_rows and total_rows > visible_rows_number:
        for key in data.keys():
            data_with_add[key] = data[key].copy()
            data_with_add[key].append("...")
    if not data_with_add:
        data_with_add = data
    markdown = tabulate.tabulate(
        data_with_add,
        headers="keys",
        tablefmt="pipe",
        numalign="decimal",
        stralign="left",
        missingval="?",
        disable_numparse=True,
    )

    if total_rows:
        partial = ""
        result = f"Sample of rows for table **{name} ({visible_rows_number} out of {total_rows} rows)**.{partial}\n\n{markdown}\n"
        if visible_rows_number < total_rows and include_warning:
            partial = f"\nNote: You are only given a part of a table ({visible_rows_number} out of {total_rows} rows), make sure it's enough for you to answer the question.\n"

        return f"{result}{partial}"
    else:
        result = f"Sample data for table **{name}**\n{markdown}\n"
        if not markdown or total_rows == 0:
            result += "(Empty table)\n"
        return result
