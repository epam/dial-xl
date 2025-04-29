from testing.framework import AddTable, FrameProject, Text


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
