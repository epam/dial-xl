from contextvars import ContextVar
from tempfile import NamedTemporaryFile, TemporaryDirectory
from types import CodeType


class VirtualDirectory:
    def __init__(self, parent_dir: str | None = None):
        active_manager = FOLDER_MANAGER.get()
        self._directory = (
            active_manager.directory
            if active_manager is not None
            else TemporaryDirectory(prefix="xl_code_dir_", dir=parent_dir)
        )

    @property
    def directory(self) -> TemporaryDirectory:
        return self._directory

    def compile(self, code: str) -> CodeType:
        code_file = NamedTemporaryFile(
            prefix="xl_code_", suffix=".py", dir=self.directory.name, delete=False
        )

        code_file.write(code.encode())
        code_file.flush()
        code_file.close()

        return compile(code, code_file.name, "exec")

    def __enter__(self):
        if FOLDER_MANAGER.get() is None:
            FOLDER_MANAGER.set(self)

        return self

    def __exit__(self, _, __, ___):
        if FOLDER_MANAGER.get() is not self:
            return False

        self._directory.cleanup()
        FOLDER_MANAGER.set(None)

        return False


FOLDER_MANAGER: ContextVar[VirtualDirectory | None] = ContextVar(
    "__quantgrid_virtual_dir_manager", default=None
)
