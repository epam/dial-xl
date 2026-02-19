from collections.abc import Collection

from jinja2 import Environment
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI
from public import public
from pydantic import BaseModel, Field
from quantgrid.models import Action

from dial.xl.converter.llm.structured_output import generate_structured_output


@public
class Column(BaseModel):
    table_name: str
    column_name: str


@public
class ValueAssertion(BaseModel):
    """Row-wise value assertion with columns from ground truth answer."""

    columns: list[Column] = Field(
        default=[],
        description="References to ground truth columns that will be asserted.",
    )

    # Pass if >= N values match.
    required_match: int | None = Field(
        default=None,
        description="Minimum number of values that should match, e.g. 3 for top-3, None for all rows. Default: None (match all rows).",
    )
    ordered: bool = Field(
        default=True, description="If rows should be compared in the exact same order."
    )


@public
class ValueAssertionsResponse(BaseModel):
    reasoning: str = Field(description="Reasoning for chosen columns")
    assertions: list[ValueAssertion] = Field(description="Columns for test assertions")


@public
async def extract_value_assertions(
    model: AzureChatOpenAI,
    templates: Environment,
    query_text: str,
    canonical_answer: str,
    original_sheets: dict[str, str],
    canonical_solution: dict[str, str],
    diff: Collection[Action],
) -> ValueAssertionsResponse | BaseException:
    system_prompt = templates.get_template("extract-value-assertions.md.jinja")
    rendered_system_prompt = await system_prompt.render_async(
        query_text=query_text,
        canonical_answer=canonical_answer,
        original_sheets=original_sheets,
        canonical_solution=canonical_solution,
        diff=diff,
    )

    history = [
        SystemMessage(rendered_system_prompt),
        HumanMessage(canonical_answer),
    ]

    return await generate_structured_output(model, history, ValueAssertionsResponse)
