def fix_sheet(dsl: str) -> str:
    lines = dsl.split("\n")

    i = 0
    while i < len(lines):
        if lines[i].startswith("table"):
            if i >= 1 and lines[i - 1].startswith("!layout"):
                pass
            else:
                lines.insert(i, f'!layout(0, {i}, "title", "headers")')
                i += 1

        i += 1

    return "\n".join(lines) + "\n"
