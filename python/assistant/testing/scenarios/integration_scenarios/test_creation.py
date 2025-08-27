from testing.framework import AddTable, FrameProject


async def test_manual_creation(basic_project: FrameProject):
    answer = await basic_project.query(
        #   Create a manual table named "Manual" containing two columns: "A" and "B".
        """
        Create a table named "Manual" containing two columns: "A" and "B".
        This table should contain three rows the following values: 1 "X", 2 "Y", 3 "Z"
        """
    )

    answer.assertion(
        AddTable(table_regex="Manual", A=["1", "2", "3"], B=["X", "Y", "Z"])
    )


async def test_field_referencing(basic_project: FrameProject):
    await basic_project.create_table(
        code="""
        !manual()
        table Manual
          [A]
          [B]
        override
          [A],[B]
          1, "X"
          2, "Y"
          3, "Z"
        """
    )

    answer = await basic_project.query(
        """
        I need to reference columns in one table from another.
        Create table named ""Reference"" with two columns named: "RefA" and "RefB".
        "RefA" column should reference to "A" column of table "Manual", and "RefB" - to column "B" of table "Manual".
        In general ""Reference"" should have all the same values as table "Manual"
        """
    )

    answer.assertion(
        AddTable(table_regex="Reference", RefA=["1", "2", "3"], RefB=["X", "Y", "Z"])
    )
