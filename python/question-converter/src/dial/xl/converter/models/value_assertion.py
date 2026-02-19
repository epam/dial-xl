from public import public
from pydantic import BaseModel

from dial.xl.converter.models.reference import ColumnReference


@public
class ValueAssertion(BaseModel):
    columns: list[ColumnReference]

    # Pass if >= N values match.
    required_match: int | None = None
    ordered: bool = True
