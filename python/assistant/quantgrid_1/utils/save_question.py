import re
import uuid

from datetime import UTC, datetime
from pathlib import Path

from dial_xl.compile import HashableFieldType
from dial_xl.project import Project

from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import FieldGroupUtil
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.question import HashColumn, Message, Question
from quantgrid_1.models.question_status import QuestionStatus


async def save_question(
    dial_api: DIALApi,
    project_path: str,
    *,
    status: QuestionStatus,
    history: list[Message],
    question: str,
    answer: str,
    original_project: Project,
    solution_project: Project,
    focus: Focus,
) -> str:
    focus_hashes = await _fetch_focus_hashes(solution_project, focus)

    struct = Question(
        id=uuid.uuid4(),
        timestamp=datetime.now(tz=UTC),
        status=status,
        history=history,
        question=question,
        answer=answer,
        reviewed=False,
        original_sheets=original_project.to_dsl(),
        solution_sheets=solution_project.to_dsl(),
        focus=focus_hashes,
    )

    question_folder = await _create_question_folder(dial_api, Path(project_path))
    return (await _create_question_file(dial_api, question_folder, struct)).as_posix()


async def _fetch_focus_hashes(project: Project, focus: Focus) -> list[HashColumn]:
    await project.compile()

    hashes: list[HashColumn] = []
    for column in focus.columns:
        if column.sheet_name not in project.sheet_names:
            continue

        sheet = project.get_sheet(column.sheet_name)

        if column.table_name not in sheet.table_names:
            continue

        table = sheet.get_table(column.table_name)

        static_field = FieldGroupUtil.get_field_by_name(table, column.column_name)
        dynamic_field = (
            table.get_dynamic_field(column.column_name)
            if column.column_name in table.dynamic_field_names
            else None
        )

        if (field := static_field or dynamic_field) is None:
            continue

        hash_column = HashColumn(
            sheet_name=column.sheet_name,
            table_name=column.table_name,
            column_name=column.column_name,
        )

        if isinstance(field.field_type, HashableFieldType):
            hash_column.hash = field.field_type.hash

        hashes.append(hash_column)

    return hashes


async def _create_question_folder(dial_api: DIALApi, project_path: Path) -> Path:
    question_folder = project_path.with_suffix("") / "questions"
    await dial_api.create_folder(question_folder.as_posix())

    return question_folder


async def _create_question_file(
    dial_api: DIALApi, question_folder: Path, struct: Question
) -> Path:
    illegal_symbols = r"[:;,=/{}%&\]"
    illegal_spaces = r"(\r\n|\n|\r|\t)|[\x00-\x1F]"

    fixed_question = re.sub(
        pattern=f"{illegal_symbols}|{illegal_spaces}",
        repl="_",
        string=struct.question,
        flags=re.MULTILINE,
    )

    reviewed = str(struct.reviewed).lower()
    base_file_name = f"{struct.status}__{reviewed}__{fixed_question[:100]}"

    file_path = _get_question_file_path(question_folder, base_file_name)
    content = struct.model_dump_json(indent=2)

    status = await dial_api.create_file(file_path.as_posix(), file_path.name, content)
    if status:
        return file_path

    index: int = 1
    folder_files = set(await dial_api.list_folder(question_folder.as_posix()))
    while (
        file_path := _get_question_file_path(question_folder, base_file_name, index)
    ).as_posix() in folder_files:
        index += 1

    await dial_api.create_file(file_path.as_posix(), file_path.name, content)
    return file_path


def _get_question_file_path(
    question_folder: Path, base_file_name: str, index: int = 0
) -> Path:
    if not index:
        return (question_folder / base_file_name).with_suffix(".json")

    file_name = Path(base_file_name + f" {index}").with_suffix(".json")
    return question_folder / file_name
