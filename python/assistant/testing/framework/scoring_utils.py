from typing import Any, cast

from dial_xl.project import Project
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI

from quantgrid.configuration import LOGGER, Env
from quantgrid.python import PythonEnv
from quantgrid.startup import load_solver_system, load_templates
from quantgrid.utils.llm import ainvoke_model, parse_structured_output
from quantgrid.utils.project import ProjectCalculator, ProjectUtil
from testing.models import AssistantScore

PROMPT = PromptTemplate.from_template(
    """
### Instruction ###

You are a high-grade AI testing and scoring agent for the DIAL XL Interface.
Your task is to analyze and score output and generated actions of DIAL XL code generation assistant agent.
Your decisions will be used to define if auto-test is passed or not.
Tables in environment are fixed and their data cannot change over time.
All user requests should be perceived as correct, as this is auto-test environment.

Solution is considered PASSED in case:
1. Agent solution is fully answering to ALL user requests (questions).
2. Contents of created tables are valid and satisfy user request.
3. All result assertions are satisfied.

Solution is considered PARTIAL in case:
1. There are several logical parts in user question and agent correctly satisfied only subset of user question parts.
2. Result assertions are only partly satisfied.

Solution is considered FAILED in case:
1. Agent failed to produce logically correct solution.
2. Generated tables contain malformed of invalid / non-relevant data.
3. Result assertions are not satisfied.

Result Assertions must be perceived as ground truth, as their assertions must be always satisfied.

### User Request ###

{query}

### Result Assertions ###

{expectation}

### Resulting Python Workspace State ###

{workspace}

### Resulting Workspace Table Content Headers ###

{headers}

"""
)


async def score_answer(
    model: AzureChatOpenAI,
    query: str,
    expectation: str,
    compiled_project: Project,
    project_util: ProjectUtil,
) -> AssistantScore:
    structured_model = model.with_structured_output(
        AssistantScore, method="function_calling", include_raw=True
    )

    headers = await ProjectCalculator.format_project_tables(
        compiled_project, project_util, Env.CONTEXT_ROWS, None, 0
    )

    response = await ainvoke_model(
        structured_model,
        [
            load_solver_system(),
            HumanMessage(
                PROMPT.format(
                    query=query,
                    expectation=(
                        expectation
                        if not expectation.isspace()
                        else "No special assertions."
                    ),
                    workspace=PythonEnv.to_python_code(
                        load_templates(), compiled_project, parse_formulas=False
                    ).python_code,
                    headers="\n\n".join(headers.values()),
                )
            ),
        ],
        None,
        10,
        20,
    )

    if isinstance(response, Exception):
        raise response

    raw, output, error = parse_structured_output(
        AssistantScore, cast(dict[str, Any], response)
    )

    if error is not None or output is None:
        raise RuntimeError(
            f"Failed to estimate assistant score: {raw}. Error: {error}."
        )

    LOGGER.info(f"Estimated Score: {output.model_dump_json()}.")
    return output
