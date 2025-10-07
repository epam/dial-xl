from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from quantgrid.utils.string import code_snippet
from quantgrid_1.models.config_parameters import ConfigParametersDTO
from quantgrid_1.models.focus import Column, Focus
from quantgrid_1.models.generation_parameters import (
    CHANGED_SHEETS_STAGE_NAME,
    FOCUS_STAGE_NAME,
    SUMMARY_STAGE_NAME,
    GenerationParameters,
)
from quantgrid_1.models.materialize_button import MaterializeButton
from quantgrid_1.models.project_state import ProjectState
from quantgrid_1.models.stage import Attachment, Stage
from testing.framework import AddTable, FrameProject, Text, code_regex, code_substr
from testing.framework.exceptions import MatchError


# Tests that bot works normally when underlying LLM generated two JSONs
# with actions in "Thinking" format. Only the last JSON action application is expected.
async def test_chained_jsons(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Generate several different jsons in one answer.
        In first JSON, create a table named "First" with range to 10.
        In second JSON, create a table named "Second" with range to 20.

        Important: separate JSONs by regular text: "Text delimiter".
        """
    )

    answer.assertion(Text() & AddTable(table_substrings="Second"), strict=True)


# Test that all created new tables are added to ACTIVE sheet.
# This tests the usage of "DSL" in Changed Sheets sections.
async def test_flexible_changes(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Generate one empty table in sheet "A".
        """
    )

    answer.assertion(
        Text() & AddTable(sheet_substrings="Main"),
        strict=True,
    )


# Tests that all new !format decorators are removed in post-processing.
# This is due to LLM abusing decorators while not knowing anything about them.
async def test_format_remove(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Generate a table with one column (RANGE(5)),
        and apply decorator !format("currency", 1, 0, "$") to the created column.

        table R
            !format("currency", 1, 0, "$")
            dim [RANGE] = RANGE(5)
        """
    )

    def validate(_, __, table: Table) -> None:
        assert not code_substr(table, "!format")

    answer.assertion(
        Text() & AddTable(validator=validate),
        strict=True,
    )


async def test_materialize_button(
    bucket: str, client: Client, basic_project: FrameProject
):
    answer = await basic_project.query(
        "Generate a table with numbers from 1 to 10.",
        parameters=ConfigParametersDTO(
            generation_parameters=GenerationParameters(materialize=True)
        ),
    )

    basic_project.apply(answer)

    save_path = MaterializeButton.new_project_button(bucket).const
    answer = await basic_project.query("", buttons={"save_path": save_path})
    basic_project.apply(answer)

    materialized_project = await client.parse_project(save_path)
    assert materialized_project.to_dsl() == answer.get_project_state().to_dsl()


async def test_predefined_answer(basic_project: FrameProject):
    predefined_code = "table A\n  [ignore] = 0\n"
    answer = await basic_project.query(
        "Do absolutely nothing. Chill.",
        parameters=ConfigParametersDTO(
            generation_parameters=GenerationParameters(
                saved_stages=[
                    Stage(name=SUMMARY_STAGE_NAME, content="FORCED SUMMARY TEXT"),
                    Stage(
                        name=CHANGED_SHEETS_STAGE_NAME,
                        attachments=[
                            Attachment(
                                title="DSL (PREDEFINED)",
                                data=code_snippet("", predefined_code),
                            ),
                        ],
                    ),
                    Stage(
                        name=FOCUS_STAGE_NAME,
                        content=code_snippet(
                            "json",
                            Focus(
                                columns=[
                                    Column(
                                        sheet_name="PREDEFINED",
                                        table_name="A",
                                        column_name="ignore",
                                    )
                                ]
                            ).model_dump_json(indent=2),
                        ),
                    ),
                ],
            )
        ),
    )

    def validate(project: Project, _: Sheet, table: Table) -> None:
        assert len([_ for _ in project.sheets]) == 1
        assert len([_ for _ in table.field_groups]) == 1
        assert code_regex(table, "0", "ignore")

    answer.assertion(
        Text(regex="FORCED SUMMARY TEXT")
        & AddTable(validator=validate, sheet_regex="PREDEFINED", is_focused=True),
        strict=True,
    )


async def test_regenerate(basic_project: FrameProject):
    predefined_code = "table A\n  [ignore] = 0\n"
    answer = await basic_project.query(
        "Do not pay attention to actions. Just say 'Have a nice day!'",
        parameters=ConfigParametersDTO(
            generation_parameters=GenerationParameters(
                generate_summary=True,
                saved_stages=[
                    Stage(name=SUMMARY_STAGE_NAME, content="IRRELEVANT TEXT"),
                    Stage(
                        name=CHANGED_SHEETS_STAGE_NAME,
                        attachments=[
                            Attachment(
                                title="DSL (PREDEFINED)",
                                data=code_snippet("", predefined_code),
                            ),
                        ],
                    ),
                    Stage(
                        name=FOCUS_STAGE_NAME,
                        content=code_snippet(
                            "json",
                            Focus(
                                columns=[
                                    Column(
                                        sheet_name="PREDEFINED",
                                        table_name="A",
                                        column_name="ignore",
                                    )
                                ]
                            ).model_dump_json(indent=2),
                        ),
                    ),
                ],
            )
        ),
    )

    answer.assertion(
        Text(regex="Have a nice day!")
        & AddTable(sheet_regex="PREDEFINED", is_focused=True),
        strict=True,
    )


async def test_thinking_by_solution(clients_project: FrameProject):
    predefined_code = """
table CashCows
  dim [cow] = Clients.FILTER(Clients[revenue] > 100)

table SortedCashCows
  dim [cow] = CashCows.SORTBY(-CashCows[cow][revenue])[cow]
  [name] = [cow][name]
  [revenue] = [cow][revenue]
"""

    attachments: list[Attachment] = []
    for sheet in clients_project.get_project().sheets:
        attachments.append(
            Attachment(
                title=f"DSL ({sheet.name})", data=code_snippet("", sheet.to_dsl())
            )
        )

    _ = await clients_project.query(
        "Create sorted table of cash cows. Client is considered a cash cow if its revenue > 100.",
        parameters=ConfigParametersDTO(
            generation_parameters=GenerationParameters(
                generate_focus=False,
                generate_summary=True,
                saved_stages=[
                    Stage(name=SUMMARY_STAGE_NAME, content="IRRELEVANT TEXT"),
                    Stage(
                        name=CHANGED_SHEETS_STAGE_NAME,
                        attachments=[
                            *attachments,
                            Attachment(
                                title="DSL (PREDEFINED)",
                                data=code_snippet("", predefined_code),
                            ),
                        ],
                    ),
                ],
            )
        ),
    )

    query = clients_project.get_queries()[-1]
    if "plan" not in query.text.lower() or "Thinking" not in query.text:
        raise MatchError("Cannot find **Thinking** partition of Choice content.")


async def test_empty_selection_validation(basic_project: FrameProject):
    project_state = ProjectState(project_name="", selection={}, sheets={})
    assert project_state.selection is None

    json_content = '{"currentProjectName": "", "selection": {}, "sheets": {}}'
    project_state = ProjectState.model_validate_json(json_content)
    assert project_state.selection is None
