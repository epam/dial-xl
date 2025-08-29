import asyncio
import re

from typing import NamedTuple

from jinja2 import Environment

from quantgrid.python import PythonEnv
from quantgrid.utils.project import ProjectUtil
from quantgrid.utils.string import code_snippet

_CODE_SNIPPET = re.compile("```(?i:xl)[\r\n]+(.*?)[\r\n]+```", re.DOTALL)


class ConvertedText(NamedTuple):
    formatted_text: str
    conversion_errors: list[str]


async def parse_snippets(
    project_util: ProjectUtil, templates: Environment, text: str
) -> ConvertedText:
    matches = list(re.finditer(_CODE_SNIPPET, text))

    processed = await asyncio.gather(
        *(_replace(project_util, templates, match.group(1)) for match in matches)
    )

    errors: list[str] = []
    for _, snippet_errors in processed:
        errors.extend(snippet_errors)

    replacements = {
        match.group(): snippet for match, (snippet, _) in zip(matches, processed)
    }

    formatted_text = re.sub(
        _CODE_SNIPPET, lambda match: replacements[match.group()], text
    )
    return ConvertedText(formatted_text, errors)


async def _replace(
    util: ProjectUtil, templates: Environment, xl_code: str
) -> tuple[str, list[str]]:
    project = await util.create_project_from_code("_replace", {"main": xl_code})
    await util.compile_with_dynamic_fields(project)

    python_project = PythonEnv.to_python_code(templates, project, parse_formulas=True)

    plain_errors: list[str] = []
    for table_name, table_errors in python_project.conversion_errors.items():
        for field_name, field_error in table_errors.items():
            plain_errors.append(f"{table_name}.{field_name}: {field_error}")

    return code_snippet("python", python_project.python_code), plain_errors
