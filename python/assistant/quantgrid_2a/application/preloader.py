import typing

from langchain_core.messages import BaseMessage

from quantgrid.startup import load_hints_system
from quantgrid_2a.configuration import Env
from quantgrid_2a.models import FunctionInfo
from quantgrid_2a.startup import (
    load_examples,
    load_functions,
    load_router_system,
    load_solver_prompt,
    load_solver_system,
)


class Preloader:

    def __init__(self):
        self.functions: dict[str, FunctionInfo] = {}

        self.router_prologue: typing.List[BaseMessage] = []
        self.solver_prologue: typing.List[BaseMessage] = []
        self.hints_prologue: list[BaseMessage] = []

        self.solver_prompt: str = ""

    async def preload(self):
        self.functions = load_functions(Env.FUNCTION_DIR)

        self.solver_prologue = [
            load_solver_system(self.functions),
            *await load_examples(Env.EXAMPLE_DIR + "/solver"),
        ]

        self.router_prologue = [load_router_system()]

        self.hints_prologue = [load_hints_system()]

        self.solver_prompt = load_solver_prompt()
