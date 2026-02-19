import asyncio

from asyncio import Queue, Task, create_task, gather
from collections.abc import Collection
from pathlib import Path

import click

from dotenv import load_dotenv
from public import private, public
from rich.console import Console

from dial.xl.converter.cli.progress import create_progress
from dial.xl.converter.cli.worker import WorkerTask, worker
from dial.xl.converter.models.settings import Settings


@public
def main() -> None:
    load_dotenv(Path(".env"))
    batch_convert()


@click.command()
@click.option(
    "--api-key",
    type=str,
    envvar="API_KEY",
    required=True,
    help="DIAL Api Key (env: API_KEY)",
)
@click.option(
    "--model-name",
    type=str,
    envvar="MODEL_NAME",
    required=True,
    help="DIAL Model Name (env: MODEL_NAME)",
)
@click.option(
    "--dial-url",
    type=str,
    envvar="DIAL_URL",
    required=True,
    help="DIAL Core URL (env: DIAL_URL)",
)
@click.option(
    "--xl-url",
    type=str,
    envvar="XL_URL",
    required=True,
    help="DIAL XL URL (env: XL_URL)",
)
@click.option("--workers", type=int, default=1)
@click.argument(
    "source-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
)
@click.argument(
    "destination-dir", type=click.Path(dir_okay=True, file_okay=False, path_type=Path)
)
def batch_convert(
    api_key: str,
    model_name: str,
    dial_url: str,
    xl_url: str,
    workers: int,
    source_dir: Path,
    destination_dir: Path,
) -> None:
    console = Console()
    settings = Settings.from_parameters(api_key, model_name, dial_url, xl_url)

    source_files = list(source_dir.rglob("*.json"))
    console.print(f"Found {len(source_files)} convert candidates.")

    asyncio.run(
        _batch_convert(
            source_dir,
            source_files,
            destination_dir,
            workers=workers,
            console=console,
            settings=settings,
        )
    )


@private
async def _batch_convert(
    source_base_dir: Path,
    source_files: Collection[Path],
    destination_dir: Path,
    *,
    workers: int,
    console: Console,
    settings: Settings,
) -> None:
    async_queue = Queue[WorkerTask]()
    for source_file in source_files:
        async_queue.put_nowait(
            WorkerTask(source_base_dir, source_file, destination_dir)
        )

    with create_progress(console) as progress:
        progress_id = progress.add_task("Converting...", total=len(source_files))

        worker_tasks: list[Task[None]] = []
        for _ in range(workers):
            worker_coro = worker(console, settings, async_queue, progress, progress_id)
            worker_tasks.append(create_task(worker_coro))

        await async_queue.join()
        for task in worker_tasks:
            task.cancel()

        await gather(*worker_tasks, return_exceptions=True)
