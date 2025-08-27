from dial_xl.table import Table

from testing.framework import AddTable, FrameProject, Text, code_regex


async def test_file_input(casualties_project: FrameProject):
    answer = await casualties_project.query("List all columns in this table.")
    answer.assertion(Text())


async def test_multifield_access(casualties_project: FrameProject):
    answer = await casualties_project.query(
        "Create a new table that will contain columns 'WINS Claim Number' and 'Claim Status' from table 'Casualties'. "
        "Use multiple column selector Table[[column1],[column2]]"
    )

    def check(_, __, table: Table):
        assert code_regex(table, r"(?i).*[WINS Claim Number].*")
        assert code_regex(table, r"(?i).*[Claim Status].*")
        assert code_regex(table, r"(?i).*\[\[(.*?)\],\s?\[(.*?)\]\].*")

    answer.assertion(Text() & AddTable(validator=check))


async def test_multifield_filter(casualties_project: FrameProject):
    answer = await casualties_project.query(
        "Create a new table from columns WINS Claim Number, Claim Reported Date, Claim Closed Date, Claim Status "
        "of table Casualties but only for Life Sciences segment."
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, "(?i).*(Life Sciences).*")

    answer.assertion(Text() & AddTable(validator=check))


async def test_multifield_input(casualties_project: FrameProject):
    await casualties_project.create_table(
        table_name="LifeSciencesClaims",
        sheet_name="Main",
        code=f"table LifeSciencesClaims\n"
        f"  dim [WINS Claim Number], [Line of Business], [Claim Reported Date], [Claim Closed Date], [Claim Status] "
        f'= FILTER(Casualties, Casualties[Business Segment] = "Life Sciences")'
        f"[[WINS Claim Number], [Line of Business], [Claim Reported Date], [Claim Closed Date], [Claim Status]]",
    )
    answer = await casualties_project.query(
        "Create a new table from columns WINS Claim Number, Claim Status "
        "of table LifeSciencesClaims but only for General Liability line of business."
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, "(?i).*(General Liability).*")

    answer.assertion(Text() & AddTable(validator=check))


async def test_source_filter_input(casualties_project: FrameProject):
    await casualties_project.create_table(
        table_name="LifeSciencesClaims",
        sheet_name="Main",
        code=f"table LifeSciencesClaims\n"
        f'  dim [source] = FILTER(Casualties, Casualties[Business Segment] = "Life Sciences")\n'
        f"  [WINS Claim Number] = [source][WINS Claim Number]\n"
        f"  [Line of Business] = [source][Line of Business]\n"
        f"  [Claim Reported Date] = [source][Claim Reported Date]\n"
        f"  [Claim Closed Date] = [source][Claim Closed Date]\n"
        f"  [Claim Status] = [source][Claim Status]",
    )
    answer = await casualties_project.query(
        "Create a new table from columns WINS Claim Number, Claim Status "
        "of table LifeSciencesClaims but only for General Liability line of business."
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, "(?i).*(General Liability).*")

    answer.assertion(Text() & AddTable(validator=check))
