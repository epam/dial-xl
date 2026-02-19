from jinja2 import Environment
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI
from public import public
from pydantic import BaseModel, Field

from dial.xl.converter.llm.structured_output import generate_structured_output


@public
class EntityAssertionsResponse(BaseModel):
    reasoning: str = Field(description="Reasoning for chosen entities")
    entities: list[str] = Field(description="String entities for test assertions")
    numbers: list[str] = Field(description="Numbers for test assertions")


@public
async def extract_entity_assertions(
    model: AzureChatOpenAI,
    templates: Environment,
    query_text: str,
    canonical_answer: str,
) -> EntityAssertionsResponse | BaseException:
    system_prompt = templates.get_template("extract-entity-assertions.md.jinja")
    rendered_system_prompt = await system_prompt.render_async()
    human_message = f"Query: {query_text}\n\nGround truth answer: {canonical_answer}"

    history = [
        SystemMessage(rendered_system_prompt),
        HumanMessage(human_message),
    ]

    return await generate_structured_output(model, history, EntityAssertionsResponse)
