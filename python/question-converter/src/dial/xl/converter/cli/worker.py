from asyncio import Queue
from pathlib import Path

from attrs import frozen
from public import private, public
from quantgrid_1.models.question import Question
from rich.console import Console
from rich.markup import escape
from rich.progress import Progress, TaskID
from rich.text import Text

from dial.xl.converter.cli.generate_assertions import generate_assertions
from dial.xl.converter.cli.work_status import WorkStatus
from dial.xl.converter.models.assertion_suite import AssertionSuite
from dial.xl.converter.models.query import Query
from dial.xl.converter.models.reference import ColumnReference
from dial.xl.converter.models.settings import Settings
from dial.xl.converter.models.test import Test


@public
@frozen
class WorkerTask:
    source_base_dir: Path
    source_file: Path

    destination_dir: Path


@public
async def worker(
    console: Console,
    settings: Settings,
    queue: Queue[WorkerTask],
    progress: Progress,
    progress_id: TaskID,
) -> None:
    while task := await queue.get():
        try:
            await _process_task(task, settings=settings, console=console)
        except Exception:  # noqa: BLE001
            console.print_exception()
        finally:
            progress.advance(progress_id)
            queue.task_done()


@private
async def _process_task(
    task: WorkerTask, *, settings: Settings, console: Console
) -> None:
    source_file = task.source_file
    relative_source = source_file.relative_to(task.source_base_dir)
    destination_file = task.destination_dir / relative_source

    work_name = Text.from_markup(
        escape(source_file.as_posix()) + " → " + escape(destination_file.as_posix())
    )

    with WorkStatus(work_name, "Pending", console=console) as status:
        if _try_touch(destination_file) is not None:
            message = Text.from_markup("Skipped", style="bold yellow")
            status.update_status(message)
            return

        try:
            await _convert_file(
                task.source_file,
                destination_file,
                status=status,
                settings=settings,
                console=console,
            )
        except BaseException:
            destination_file.unlink()
            raise


@private
async def _convert_file(
    source_file: Path,
    destination_file: Path,
    *,
    status: WorkStatus,
    settings: Settings,
    console: Console,
) -> None:
    status.update_status("Parsing Question")

    question = Question.model_validate_json(source_file.read_text("utf-8"))

    query = _create_query(question)
    suite = _create_empty_suite(question)

    status.update_status("Generating Assertions")

    assertions = await generate_assertions(
        query,
        suite.canonical_answer,
        suite.canonical_solution,
        settings=settings,
        console=console,
    )

    suite.statements = assertions.statements
    suite.numbers = assertions.numbers
    suite.entities = assertions.entities

    suite.function_assertions = assertions.functions
    suite.reference_assertions = assertions.references
    suite.value_assertions = assertions.values

    status.update_status("Saving")

    dumped = Test(query=query, suites=[suite]).model_dump_json(indent=4)
    destination_file.write_text(dumped, "utf-8")

    status.update_status(Text.from_markup("OK", style="bold green"))


@private
def _try_touch(path: Path) -> FileExistsError | None:
    try:
        path.touch(exist_ok=False)
    except FileExistsError as error:
        return error

    return None


@private
def _create_query(question: Question) -> Query:
    return Query(
        messages=question.history,
        original_sheets=question.original_sheets,
    )


@private
def _create_empty_suite(question: Question) -> AssertionSuite:
    return AssertionSuite(
        canonical_answer=question.answer,
        canonical_focus=[
            ColumnReference(table_name=focus.table_name, column_name=focus.column_name)
            for focus in question.focus
        ],
        canonical_solution=question.solution_sheets,
    )
