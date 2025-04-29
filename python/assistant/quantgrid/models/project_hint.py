import pydantic


class ProjectHint(pydantic.BaseModel):
    name: str = pydantic.Field(description="Name of the hint.")
    triggers: list[str] = pydantic.Field(
        description="List of triggers that can be used to activate the hint."
    )
    suggestion: str = pydantic.Field(description="Suggestion for the agent.")

    def format_for_hints_selector(self) -> str:
        result = f"### Name: {self.name} ###\n\n"
        result += "Triggers:\n"
        for i, trigger in enumerate(self.triggers):
            result += f"{i + 1}. {trigger}\n"
        return result

    def format_for_solver(self) -> str:
        result = "### Hint Triggers ###\n\n"
        for i, trigger in enumerate(self.triggers):
            result += f"{i + 1}. {trigger}\n"

        result += f"\n### Hint Suggestion ###\n\n{self.suggestion}\n"
        return result
