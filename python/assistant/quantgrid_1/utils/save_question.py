import uuid

from datetime import UTC, datetime

from dial_xl.compile import HashableFieldType
from dial_xl.project import Project

from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import FieldGroupUtil
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.question import HashColumn, Question
from quantgrid_1.models.question_status import QuestionStatus


async def save_question(
    dial_api: DIALApi,
    project_folder: str,
    *,
    status: QuestionStatus,
    question: str,
    answer: str,
    original_project: Project,
    solution_project: Project,
    focus: Focus,
) -> None:
    focus_hashes = await _fetch_focus_hashes(solution_project, focus)

    struct = Question(
        id=uuid.uuid4(),
        timestamp=datetime.now(tz=UTC),
        status=status,
        question=question,
        answer=answer,
        reviewed=False,
        original_sheets=original_project.to_dsl(),
        solution_sheets=solution_project.to_dsl(),
        focus=focus_hashes,
    )

    question_folder = await _create_question_folder(dial_api, project_folder)
    await _create_question_file(dial_api, question_folder, struct)


async def _fetch_focus_hashes(project: Project, focus: Focus) -> list[HashColumn]:
    await project.compile()

    hashes: list[HashColumn] = []
    for column in focus.columns:
        sheet = project.get_sheet(column.sheet_name)
        table = sheet.get_table(column.table_name)

        static_field = FieldGroupUtil.get_field_by_name(table, column.column_name)
        field = static_field or table.get_dynamic_field(column.column_name)

        hash_column = HashColumn(
            sheet_name=column.sheet_name,
            table_name=column.table_name,
            column_name=column.column_name,
        )

        if isinstance(field.field_type, HashableFieldType):
            hash_column.hash = field.field_type.hash

        hashes.append(hash_column)

    return hashes


async def _create_question_folder(dial_api: DIALApi, project_folder: str) -> str:
    question_folder = project_folder.rstrip("/") + "/questions"
    await dial_api.create_folder(question_folder)

    return question_folder


async def _create_question_file(
    dial_api: DIALApi, question_folder: str, struct: Question
) -> None:
    file_name = f"{struct.id.hex}.json"
    file_path = question_folder.rstrip("/") + "/" + file_name
    content = struct.model_dump_json(indent=2)

    await dial_api.create_file(file_path, file_name, content)
