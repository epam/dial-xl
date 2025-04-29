from testing.framework import FrameProject
from testing.framework.exceptions import MatchingError


async def _run_routing_check(
    project: FrameProject, target_routing_class: str, queries: list[str]
):
    wrong_answers = []
    for query in queries:
        answer = await project.query(query)
        cls_result = answer.get_classification_route()
        if target_routing_class not in cls_result:
            wrong_answers.append(f"{query}: {cls_result}")
    if len(wrong_answers) > 0:
        wrong_routing_str = "\n".join(wrong_answers)
        raise MatchingError(
            f"Wrong route:\n{wrong_routing_str}\nMust be '{target_routing_class}'."
        )
    return len(wrong_answers) == 0


async def test_documentation_route(basic_project: FrameProject):
    documentation_queries = [
        "What is RANGE command?",
        "How do I create a table index?",
        "How to calculate mean value for a column?",
        "What arguments can I use in FILTER?",
    ]
    result = await _run_routing_check(
        basic_project, "Documentation", documentation_queries
    )
    assert result


async def test_actions_route(basic_project: FrameProject):
    action_query = "How many rows are there in the dataset?"
    result = await _run_routing_check(basic_project, "Actions", [action_query])
    assert result



async def test_general_route(basic_project: FrameProject):
    general_queries = ["What does this bot do?", "How to use this bot?"]
    result = await _run_routing_check(basic_project, "General", general_queries)
    assert result
