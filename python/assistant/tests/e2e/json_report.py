from pathlib import Path

from pydantic import BaseModel

from tests.e2e.models.qg_report import QGReport
from tests.e2e.utils.stats.structs import CaseStats, GlobalStats


class JsonReport(BaseModel):
    tests: dict[str, list[QGReport]]
    stats_by_case: dict[str, CaseStats]
    global_stats: GlobalStats
    prior_stats_by_case: dict[str, CaseStats]
    prior_global_stats: GlobalStats


def write_json_report(
    file_name: str,
    tests: dict[str, list[QGReport]],
    global_stats: GlobalStats,
    stats_by_case: dict[str, CaseStats],
    prior_global_stats: GlobalStats,
    prior_stats_by_case: dict[str, CaseStats],
) -> None:
    with Path(file_name).open("w", encoding="utf-8") as report_json_file:
        report_json_file.write(
            JsonReport(
                tests=tests,
                stats_by_case=stats_by_case,
                global_stats=global_stats,
                prior_stats_by_case=prior_stats_by_case,
                prior_global_stats=prior_global_stats,
            ).model_dump_json(indent=2)
        )
