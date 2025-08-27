from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from testing.framework import AddFieldOrTable, AddTable, FrameProject, find_unsorted
from testing.framework.frame_project import Hint, Trigger
from testing.framework.testing_utils import code_regex, field, field_code_regex


async def test_hint_natural_language(clients_project: FrameProject):

    await clients_project.create_ai_hint(
        hints=[
            Hint(
                name="Cash cow",
                triggers=[Trigger(value="Who are the cash cows?", isDisabled=False)],
                suggestion="Cash cow are clients of type B and having revenue more than 100",
                isDisabled=False,
            )
        ]
    )

    answer = await clients_project.query(
        """
        Who are our cash cows?
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field
        field_group = FieldGroupUtil.get_field_group_by_name(table, field.name)
        assert field_group.to_dsl()
        assert isinstance(field.field_data, FieldData)
        assert len(field.field_data.values) == 2
        assert field_code_regex(table, field, ".*100.*")
        assert field_code_regex(table, field, ".*B.*")
        assert field_code_regex(table, field, ".*FILTER.*")

        assert find_unsorted(table, ["ClientD", "ClientF"])

    answer.assertion(AddFieldOrTable(validator=validate))


async def test_hint_unknown_function(clients_project: FrameProject):

    await clients_project.create_ai_hint(
        hints=[
            Hint(
                name="Top 3 clients",
                triggers=[
                    Trigger(value="What are the top three clients?", isDisabled=False)
                ],
                suggestion="""
                    To score the clients you should use "XSPECIAL" function. Here is the example:

                    ```xl
                    table Top3Clients
                      dim [name] = Clients.SORTBY(-XSPECIAL(Clients[revenue], Clients[type]))[name].FIRST(3)
                    ```
                """,
                isDisabled=False,
            )
        ]
    )

    await clients_project.create_sheet(
        name="CustomFunctions",
        code=f"""

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

    def validate_formula(_, __, table: Table, field: Field):
        assert field
        field_group = FieldGroupUtil.get_field_group_by_name(table, field.name)
        assert field_group.to_dsl()
        assert field_code_regex(table, field, ".*XSPECIAL.*")

    def validate_data(_, __, table: Table, field: Field):
        assert field
        assert isinstance(field.field_data, FieldData)
        assert len(field.field_data.values) == 3
        assert find_unsorted(table, ["ClientB", "ClientC", "ClientF"])

    answer.assertion(
        AddFieldOrTable(validator=validate_formula)
        & AddFieldOrTable(validator=validate_data)
    )


async def test_hint_pivot(clients_project: FrameProject):

    await clients_project.create_ai_hint(
        hints=[
            Hint(
                name="Clients by type",
                triggers=[
                    Trigger(value="Clients by type breakdown?", isDisabled=False)
                ],
                suggestion="""
                    You need to use PIVOT for this:

                    ```xl
                    table ClientsByType
                      dim [_], [*] = PIVOT(Clients[empty], Clients[type], Clients[name], "COUNT")
                    ```

                    "*" field is special field specifically for PIVOT function.
                    Do not alter "*" field name.
                """,
                isDisabled=False,
            )
        ]
    )

    answer = await clients_project.query(
        """
        Create clients by type breakdown?
        """
    )

    def validate(_, __, table: Table):
        assert code_regex(table, ".*PIVOT.*")
        pivot_field = field(table, "*")
        pivot_field_group = FieldGroupUtil.get_field_group_by_name(
            table, pivot_field.name
        )
        assert pivot_field_group.to_dsl()
        assert isinstance(pivot_field.field_data, FieldData)
        assert len(pivot_field.field_data.values) == 3
        assert all(item in pivot_field.field_data.values for item in {"A", "B", "C"})

    answer.assertion(AddTable(validator=validate))


async def test_hint_chart(basic_project: FrameProject):

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
            Hint(
                name="Chart the PricingData",
                triggers=[
                    Trigger(value="Create chart for the pricing data", isDisabled=False)
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
                """,
                isDisabled=False,
            )
        ]
    )

    answer = await basic_project.query(
        """
        Chart pricing data please.
        """
    )

    def validate(_, __, table: Table):
        assert any(
            d.name == "visualization" and '("line-chart")' in d.arguments
            for d in table.decorators
        )
        assert any(
            any(d.name == "x" and "()" in d.arguments for d in field.decorators)
            for field in FieldGroupUtil.get_table_fields(table)
        )

    answer.assertion(AddTable(validator=validate))
