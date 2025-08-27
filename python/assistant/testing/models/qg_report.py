from typing import Literal

import pydantic

from testing.models.query_info import QueryInfo
from testing.models.verdict import Verdict


class QGReport(pydantic.BaseModel):
    name: str
    index: int

    status: Verdict | Literal["skipped"]

    exception_name: str | None
    exception_message: str | None

    ai_hints_text: str | None

    queries: list[QueryInfo]

    @staticmethod
    def general_status(reports: list["QGReport"]) -> Verdict | Literal["skipped"]:
        if any((report.status == "skipped" for report in reports)):
            return "skipped"

        if all((report.status == Verdict.PASSED for report in reports)):
            return Verdict.PASSED

        if any((report.status == Verdict.PASSED for report in reports)):
            return Verdict.PARTIAL

        return Verdict.FAILED
