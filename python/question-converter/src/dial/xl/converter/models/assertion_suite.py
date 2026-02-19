from typing import Annotated

from public import public
from pydantic import BaseModel, Field

from dial.xl.converter.models.reference import ColumnReference, TableReference
from dial.xl.converter.models.value_assertion import ValueAssertion

type Reference = Annotated[
    TableReference | ColumnReference, Field(discriminator="type")
]


@public
class AssertionSuite(BaseModel):
    canonical_answer: str = ""
    canonical_focus: list[ColumnReference] = []
    canonical_solution: dict[str, str] = {}

    statements: list[str] = []
    numbers: list[str] = []
    entities: list[str] = []

    function_assertions: list[str] = []
    reference_assertions: list[Reference] = []
    value_assertions: list[ValueAssertion] = []
