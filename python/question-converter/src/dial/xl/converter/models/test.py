from public import public
from pydantic import BaseModel

from dial.xl.converter.models.assertion_suite import AssertionSuite
from dial.xl.converter.models.query import Query


@public
class Test(BaseModel):
    query: Query
    suites: list[AssertionSuite] = []
