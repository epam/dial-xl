from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.dto.hint import HintDTO, TriggerDTO
from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_field_group, get_static_field
from tests.e2e.framework.expected_actions import AddFieldOrTable, AddTable
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_values_in_table,
    get_static_field_values,
    is_field_code_regex,
    is_table_code_regex,
)


async def test_hint_natural_language(clients_project: FrameProject) -> None:
    await clients_project.create_ai_hint(
        hints=[
            HintDTO(
                name="Cash cow",
                triggers=[
                    TriggerDTO(value="Who are the cash cows?", is_disabled=False)
                ],
                suggestion=(
                    "Cash cow are clients of type B and having revenue more than 100"
                ),
                is_disabled=False,
            )
        ]
    )

    answer = await clients_project.query(
        """
        Who are our cash cows?
        """
    )

    def validate(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert field

        field_group = get_field_group(table, field.name)
        assert field_group.to_dsl()
        assert isinstance(field.field_data, FieldData)
        assert len(field.field_data.values) == 2
        assert is_field_code_regex(table, field, ".*100.*")
        assert is_field_code_regex(table, field, ".*B.*")
        assert is_field_code_regex(table, field, ".*FILTER.*")

        assert are_unsorted_values_in_table(table, ["ClientD", "ClientF"])

    answer.assertion(AddFieldOrTable(validator=validate))


async def test_hint_history(clients_project: FrameProject) -> None:
    await clients_project.create_ai_hint(
        hints=[
            HintDTO(
                name="Sorting Cash Cows",
                triggers=[
                    TriggerDTO(value="Sort table with cash cows", is_disabled=False)
                ],
                suggestion="""
                When asked to sort cash cows, create table with EXACTLY ONE column: just cow names, no revenue values.

                ```xl
                table SortedCows
                    dim [name] = CowsTable[name].SORTBY(-CowsTable[revenue])
                ```
                """,  # noqa: E501
                is_disabled=False,
            )
        ]
    )

    answer = await clients_project.query(
        "Find all cash cows. "
        "Cash cow are clients of type B and having revenue more than 100."
    )

    clients_project.apply(answer)

    answer = await clients_project.query(
        """
        Sort them.
        """
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert len(table.field_groups) == 1
        field_group = table.field_groups[0]

        assert field_group.field_count == 1
        table_field = field_group.get_field(next(field_group.field_names))

        assert isinstance(table_field.field_data, FieldData)
        assert len(table_field.field_data.values) == 2

        assert get_static_field_values(table_field) == ["ClientF", "ClientD"]

    answer.assertion(AddTable(validator=validate))


async def test_hint_unknown_function(clients_project: FrameProject) -> None:
    await clients_project.create_ai_hint(
        hints=[
            HintDTO(
                name="Top 3 clients",
                triggers=[
                    TriggerDTO(
                        value="What are the top three clients?", is_disabled=False
                    )
                ],
                suggestion="""
                    To score the clients you should use "XSPECIAL" function. Here is the example:

                    ```xl
                    table Top3Clients
                      dim [name] = Clients.SORTBY(-XSPECIAL(Clients[revenue], Clients[type]))[name].FIRST(3)
                    ```
                """,  # noqa: E501
                is_disabled=False,
            )
        ]
    )

    await clients_project.create_sheet(
        name="CustomFunctions",
        code="""

        ```python
        def XSPECIAL(x: float, yt: str) -> float:
          return x * 10 if yt == "A" else x * 1000 if yt == "C" else x
        ```
        """,
    )

    answer = await clients_project.query(
        """
        What are the top 3 clients?
        """
    )

    def validate_formula(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert field
        field_group = get_field_group(table, field.name)
        assert field_group.to_dsl()
        assert is_field_code_regex(table, field, ".*XSPECIAL.*")

    def validate_data(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert field
        assert isinstance(field.field_data, FieldData)
        assert len(field.field_data.values) == 3
        assert are_unsorted_values_in_table(table, ["ClientB", "ClientC", "ClientF"])

    answer.assertion(
        AddFieldOrTable(validator=validate_formula)
        & AddFieldOrTable(validator=validate_data)
    )


async def test_hint_pivot(clients_project: FrameProject) -> None:
    await clients_project.create_ai_hint(
        hints=[
            HintDTO(
                name="Clients by type",
                triggers=[
                    TriggerDTO(value="Clients by type breakdown?", is_disabled=False)
                ],
                suggestion="""
                    You need to use PIVOT for this:

                    ```xl
                    table ClientsByType
                      dim [_], [*] = PIVOT(Clients[empty], Clients[type], Clients[name], "COUNT")
                    ```

                    "*" field is special field specifically for PIVOT function.
                    Do not alter "*" field name.
                """,  # noqa: E501
                is_disabled=False,
            )
        ]
    )

    answer = await clients_project.query(
        """
        Create clients by type breakdown?
        """
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, ".*PIVOT.*")
        pivot_field = get_static_field(table, "*")
        pivot_field_group = get_field_group(table, "*")
        assert pivot_field_group.to_dsl()
        assert isinstance(pivot_field.field_data, FieldData)
        assert len(pivot_field.field_data.values) == 3
        assert all(item in pivot_field.field_data.values for item in {"A", "B", "C"})

    answer.assertion(AddTable(validator=validate))


async def test_hint_chart(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        table_name="PricingData",
        code="""
            table PricingData
              dim [date] = RANGE(20) + 2000
              [eurusd] = 1.01^ROW()
              [chfusd] = 1.02^ROW()
        """,
    )

    await basic_project.create_ai_hint(
        hints=[
            HintDTO(
                name="Chart the PricingData",
                triggers=[
                    TriggerDTO(
                        value="Create chart for the pricing data", is_disabled=False
                    )
                ],
                suggestion="""
                    In order chart pricing data you need to use visualization("line-chart") decorator.
                    !x() can be used to define x-axis.

                    ```xl
                    !visualization("line-chart")
                    table Chart
                      dim [source] = PricingData
                      !x()
                      [date] = [source][date]
                      [eurusd] = [source][eurusd]
                      [chfusd] = [source][chfusd]
                    ```
                """,  # noqa: E501
                is_disabled=False,
            )
        ]
    )

    answer = await basic_project.query(
        """
        Chart pricing data please.
        """
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert any(
            d.name == "visualization" and '("line-chart")' in d.arguments
            for d in table.decorators
        )
        assert any(
            any(d.name == "x" and "()" in d.arguments for d in field.decorators)
            for field in iterate_static_fields(table)
        )

    answer.assertion(AddTable(validator=validate))
