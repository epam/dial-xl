from typing import Dict, List

from pydantic import BaseModel

from testing.models import QGReport


class JsonReport(BaseModel):
    tests: Dict[str, List[QGReport]]


def write_json_report(file_name: str, tests: Dict[str, List[QGReport]]) -> None:
    with open(file_name, "w", encoding="utf-8") as report_json_file:
        report_json_file.write(JsonReport(tests=tests).model_dump_json(indent=2))
