from public import public
from rich.console import Console
from rich.progress import BarColumn, MofNCompleteColumn, Progress, TextColumn

_COLUMNS = (
    TextColumn("[progress.description]{task.description}", justify="left"),
    TextColumn("｜", justify="center"),
    BarColumn(),
    MofNCompleteColumn(),
)


@public
def create_progress(console: Console) -> Progress:
    return Progress(*_COLUMNS, console=console)
