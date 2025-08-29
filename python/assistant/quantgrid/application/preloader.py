import jinja2

from langchain_core.messages import BaseMessage

from quantgrid.configuration import Env
from quantgrid.startup import (
    load_documentation_system,
    load_examples,
    load_general_system,
    load_hints_system,
    load_router_system,
    load_solver_system,
    load_templates,
)
from quantgrid.utils.llm import TokenCounter


class Preloader:
    templates: jinja2.Environment
    token_counter: TokenCounter

    def __init__(self):
        self.documentation_prologue: list[BaseMessage] = []
        self.general_prologue: list[BaseMessage] = []
        self.router_prologue: list[BaseMessage] = []
        self.solver_prologue: list[BaseMessage] = []
        self.hints_prologue: list[BaseMessage] = []

    async def preload(self):
        self.templates = load_templates()
        self.token_counter = TokenCounter(Env.LLM_TIKTOKEN_NAME)

        self.documentation_prologue = [load_documentation_system()]

        self.general_prologue = [load_general_system()]

        self.solver_prologue = [
            load_solver_system(),
            *await load_examples(Env.EXAMPLE_DIR + "/solver"),
        ]

        self.router_prologue = [load_router_system()]

        self.hints_prologue = [load_hints_system()]
