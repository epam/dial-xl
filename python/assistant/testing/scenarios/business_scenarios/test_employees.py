from dial_xl.table import Table

from testing.framework import AddField, FrameProject, Text, code_regex
from testing.framework.expected_actions import EditField, RemoveField, RemoveTable


async def test_employees_count(employees_project: FrameProject):
    question = "How many employees are there in this company?"
    gt_answer = "There are 27 employees"
    answer = await employees_project.query(question, expectation=gt_answer)

    answer.assertion(Text(substrings=["27"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_lead_employees_count(employees_project: FrameProject):
    question = "How many of the employees have Lead (=4) title?"
    gt_answer = "There are 7 employees with Lead title."
    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["7"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_employees_experience(employees_project: FrameProject):
    question = "How many employees have experience between 3-7 years?"
    gt_answer = "There are 13 employees with experience between 3-7 years."
    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["13"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_no_assig_employees(employees_project: FrameProject):
    question = "How many employees do not have any assignments?"
    gt_answer = "There are 17 employees without any assignments."
    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["17"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_no_assig_seniority_employees(employees_project: FrameProject):
    question = "What's the average seniority of the employees without assignments?"
    gt_answer = "Average seniority of employees without assignments is around 3.1."
    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["3.1"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_full_name_employees(employees_project: FrameProject):
    answer = await employees_project.query(
        "Add a column that will contain full name of employee to Employees table."
    )

    def validate(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*(&|CONCAT).*")

    answer.assertion(
        AddField(
            validator=validate,
            values=[
                "John Doe",
                "Jane Smith",
                "Emily Johnson",
                "Michael Williams",
                "Mary Brown",
                "David Jones",
                "Richard Garcia",
                "Joseph Miller",
                "Susan Davis",
                "Jessica Rodriguez",
                "Sarah Martinez",
                "Thomas Hernandez",
                "Karen Moore",
                "Nancy Taylor",
                "Lisa Anderson",
                "Betty Thomas",
                "Frank Jackson",
                "Sandra White",
                "Daniel Harris",
                "Jason Martin",
                "Alan Turner",
                "Grace Lee",
                "Ethan Wright",
                "Sophia Lopez",
                "Oliver Hill",
                "Peter Woodward",
                "Mike Pillard",
            ],
            is_focused=True,
        )
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_assignment_cost(employees_project: FrameProject):
    answer = await employees_project.query(
        "Add a column to Assignments table with a project cost."
    )
    answer.assertion(
        AddField(
            values=[
                "70",
                "30",
                "40",
                "50",
                "30",
                "55",
                "50",
                "55",
                "40",
                "55",
                "75",
                "70",
                "85",
                "40",
            ],
            is_focused=True,
        )
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_most_expensive_project(employees_project: FrameProject):
    answer = await employees_project.query(
        "Please add another column to Employees table. Call it Most Expensive Project Name. Please populate it accordingly."
    )

    def validate(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*(SORT|MAX|MAXBY).*")

    def _get_true_costs(empty_value=""):
        return (
            [
                "E-commerce Platform",
                "UI/UX Prototyping",
                "Performance Optimization",
                "UI/UX Prototyping",
                "Security Audit",
                empty_value,
                "CRM Integration",
                "E-commerce Platform",
                "Mobile App Development",
            ]
            + [empty_value] * 8
            + ["CRM Integration", empty_value, "Automated Testing Setup"]
            + [empty_value] * 7
        )

    answer.assertion(
        AddField(
            table_regex="Employees",
            field_substrings=["Most Expensive Project Name"],
            validator=validate,
            values=_get_true_costs(),
            is_focused=True,
        )
        | AddField(
            table_regex="Employees",
            field_substrings=["Most Expensive Project Name"],
            validator=validate,
            values=_get_true_costs("N/A"),
            is_focused=True,
        )
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_specific_employee(employees_project: FrameProject):
    question = "What project name Jason is working on?"
    gt_answer = "Jason is working on Automated Testing Setup project."
    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["Automated Testing Setup"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_busy_employee(employees_project: FrameProject):
    question = "Provide me top-3 busiest employees names."
    gt_answer = "Most busy employees are Joseph (optional: 3 assignments), Jane (optional: 2 assignments) and Emily (optional: 2 assignments)."

    answer = await employees_project.query(question, expectation=gt_answer)
    answer.assertion(Text(substrings=["Joseph", "Jane", "Emily"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_avg_cost(employees_project: FrameProject):
    question = (
        "Calculate average assignment cost for the employee with the most assignments."
    )
    gt_answer = "The average assignment cost for the employee with the most assignments can be either 60 or 62.5."
    answer = await employees_project.query(question, expectation=gt_answer)

    answer.assertion(Text(substrings=["60"]) | Text(substrings=["62.5"]))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())
