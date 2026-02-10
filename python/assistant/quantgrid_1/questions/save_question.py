import re
import uuid

from datetime import UTC, datetime
from pathlib import Path

from dial_xl.compile import HashableFieldType
from dial_xl.project import Project

from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import FieldGroupUtil
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.question_status import QuestionStatus
from quantgrid_1.questions.model import HashColumn, Message, Question
from quantgrid_1.questions.path_util import parse_question_file_name


async def save_question(
    dial_api: DIALApi,
    question_folder: Path,  # files/<app-bucket>/files/<user-bucket>/<path>/questions
    *,
    status: QuestionStatus,
    history: list[Message],
    question: str,
    answer: str,
    original_project: Project,
    solution_project: Project,
    focus: Focus,
) -> Question:
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

    await dial_api.create_folder(question_folder.as_posix())
    await _create_question_file(dial_api, question_folder, struct)

    return struct


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


async def _create_question_folder(dial_api: DIALApi, question_folder: Path) -> Path:
    await dial_api.create_folder(question_folder.as_posix())

    return question_folder


async def _create_question_file(
    dial_api: DIALApi, question_folder: Path, struct: Question
) -> Path:
    fixed_question = re.sub(
        pattern=r"[^a-zA-Z0-9 .!_*'()\-~]",
        repl="_",
        string=struct.question,
        flags=re.MULTILINE,
    )

    fixed_question = re.sub(r"_+", "_", fixed_question)
    fixed_question = fixed_question.strip("_ ")

    folder_file_metadata = await dial_api.list_folder(question_folder.as_posix())
    folder_file_names = set(metadata.name for metadata in folder_file_metadata)
    folder_question_names = set(
        question_metadata.name
        for file_name in folder_file_names
        if (question_metadata := parse_question_file_name(file_name)) is not None
    )

    status = struct.status
    reviewed = str(struct.reviewed).lower()
    prefix = fixed_question[:100]
    content = struct.model_dump_json(indent=2)

    index, question_name = _next_free_question_name(prefix, folder_question_names)

    file_name: str = f"{status}__{reviewed}__{question_name}.json"
    file_path: Path = question_folder / file_name
    while not await dial_api.create_file(file_path.as_posix(), file_name, content):
        index, question_name = _next_free_question_name(
            prefix, folder_question_names, index
        )

        file_name = f"{status}__{reviewed}__{question_name}.json"
        file_path = question_folder / file_name

    logger.info(f"Saved question to {file_path.as_posix()}")
    return file_path


def _next_free_question_name(
    question_prefix: str, question_names: set[str], index: int = 0
) -> tuple[int, str]:
    if not index and question_prefix not in question_names:
        return index, question_prefix

    index += 1
    while (question_name := question_prefix + f" {index}") in question_names:
        index += 1

    return index, question_name
