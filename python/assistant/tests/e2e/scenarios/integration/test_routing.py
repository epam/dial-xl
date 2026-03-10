from public import private

from tests.e2e.exceptions.match_error import MatchError
from tests.e2e.framework.frame_project import FrameProject


async def test_documentation_route(basic_project: FrameProject) -> None:
    documentation_queries = [
        "What is RANGE command?",
        "How do I create a table index?",
        "How to calculate mean value for a column?",
        "What arguments can I use in FILTER?",
    ]
    result = await run_routing_check(
        basic_project, "Documentation", documentation_queries
    )
    assert result


async def test_actions_route(basic_project: FrameProject) -> None:
    action_query = "How many rows are there in the dataset?"
    result = await run_routing_check(basic_project, "Actions", [action_query])
    assert result


async def test_explain_route(casualties_project: FrameProject) -> None:
    explanation_queries = [
        "What is the main topic of Casualties table?",
        "How can I use ULAE_GROSS column?",
        "What is this project about?",
    ]
    result = await run_routing_check(casualties_project, "Explain", explanation_queries)
    assert result


async def test_general_route(basic_project: FrameProject) -> None:
    general_queries = ["What does this bot do?", "How to use this bot?"]
    result = await run_routing_check(basic_project, "General", general_queries)
    assert result


async def test_history_routing(basic_project: FrameProject) -> None:
    query = await basic_project.query("Create a table with numbers from 1 to 10.")
    basic_project.apply(query)

    action_queries = ["Try again", "What about table from 10 to 20?"]

    result = await run_routing_check(basic_project, "Actions", action_queries)
    assert result


@private
async def run_routing_check(
    project: FrameProject, target_routing_class: str, queries: list[str]
) -> bool:
    wrong_answers = []
    for query in queries:
        answer = await project.query(query)
        cls_result = answer.get_classification_route()
        if target_routing_class not in cls_result:
            wrong_answers.append(f"{query}: {cls_result}")

    if len(wrong_answers) > 0:
        wrong_routing_str = "\n".join(wrong_answers)
        message = (
            f"Wrong route:\n{wrong_routing_str}\nMust be '{target_routing_class}'."
        )

        raise MatchError(message)

    return len(wrong_answers) == 0
