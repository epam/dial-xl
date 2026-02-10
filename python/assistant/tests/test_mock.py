import uuid

from collections.abc import Callable
from pathlib import Path

from dial_xl.client import Client
from dial_xl.project import Project
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command

from dial.xl.assistant.graph.actions.state import ActionsAgentState
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.utils.xl.create import create_project


async def test_basic_mock(
    xl_client: Client,
    actions_graph: CompiledStateGraph[ActionsAgentState, Context],
    mock_context: Callable[[Project, str], Context],
) -> None:
    code = """
    table T
        dim [value] = RANGE(10)
    """

    project = await create_project(xl_client, "test_mock", {"Main": code})
    query = "Create new column with squared value."

    config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
    context = mock_context(project, query)

    output = await actions_graph.ainvoke(
        ActionsAgentState(messages=[]), config, context=context
    )

    for message in output["messages"]:
        message.pretty_print()


async def test_mock(
    xl_client: Client,
    actions_graph: CompiledStateGraph[ActionsAgentState, Context],
    mock_context: Callable[[Project, str], Context],
) -> None:
    path = Path("tests/test_resources/disney.dsl")
    code = path.read_bytes().decode("utf-8")

    project = await create_project(xl_client, "test_mock", {"Main": code})
    query = "What was total net booked revenue in that year?"

    config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
    context = mock_context(project, query)

    output = await actions_graph.ainvoke(
        ActionsAgentState(messages=[]), config, context=context
    )

    assert "__interrupt__" in output
    output = await actions_graph.ainvoke(
        Command(resume="2023"), config, context=context
    )

    for message in output["messages"]:
        message.pretty_print()


async def test_advertisers_quarter_with_growth(
    xl_client: Client,
    actions_graph: CompiledStateGraph[ActionsAgentState, Context],
    mock_context: Callable[[Project, str], Context],
) -> None:
    path = Path("tests/test_resources/disney.dsl")
    code = path.read_bytes().decode("utf-8")

    project = await create_project(
        xl_client, "test_advertisers_quarter_with_growth", {"Main": code}
    )
    query = "Was there a quarter that had more Net Booked Revenue in 2023 than it did in 2022?"  # noqa: E501

    config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
    context = mock_context(project, query)

    output = await actions_graph.ainvoke(
        ActionsAgentState(messages=[]), config, context=context
    )

    # assert "__interrupt__" in output
    # output = await actions_graph.ainvoke(
    #     Command(resume="2023"), config, context=context
    # )

    for message in output["messages"]:
        message.pretty_print()


async def test_advertisers_percentage_of_linear_revenue(
    xl_client: Client,
    actions_graph: CompiledStateGraph[ActionsAgentState, Context],
    mock_context: Callable[[Project, str], Context],
) -> None:
    path = Path("tests/test_resources/disney.dsl")
    code = path.read_bytes().decode("utf-8")

    project = await create_project(
        xl_client, "test_advertisers_quarter_with_growth", {"Main": code}
    )
    query = "What percentage of revenue in both years was linear?"

    config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
    context = mock_context(project, query)

    output = await actions_graph.ainvoke(
        ActionsAgentState(messages=[]), config, context=context
    )
    for message in output["messages"]:
        message.pretty_print()


async def test_interrupt(
    xl_client: Client,
    actions_graph: CompiledStateGraph[ActionsAgentState, Context],
    mock_context: Callable[[Project, str], Context],
) -> None:
    code = """
    table T
        dim [value] = RANGE(10)
    """

    project = await create_project(xl_client, "test_mock", {"Main": code})
    query = "Ask me 'What do you like to eat?'"

    config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
    context = mock_context(project, query)

    output = await actions_graph.ainvoke(
        ActionsAgentState(messages=[]), config, context=context
    )

    assert "__interrupt__" in output
    output = await actions_graph.ainvoke(
        Command(resume="Cabbages!"), config, context=context
    )

    for message in output["messages"]:
        message.pretty_print()
