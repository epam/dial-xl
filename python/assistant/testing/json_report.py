from typing import Dict, List

from pydantic import BaseModel

from testing.models import QGReport
from testing.utils.stats import CaseStats, GlobalStats


class JsonReport(BaseModel):
    tests: Dict[str, List[QGReport]]
    stats_by_case: Dict[str, CaseStats]
    global_stats: GlobalStats
    prior_stats_by_case: Dict[str, CaseStats]
    prior_global_stats: GlobalStats


def write_json_report(
    file_name: str,
    tests: Dict[str, List[QGReport]],
    global_stats: GlobalStats,
    stats_by_case: Dict[str, CaseStats],
    prior_global_stats: GlobalStats,
    prior_stats_by_case: Dict[str, CaseStats],
) -> None:
    with open(file_name, "w", encoding="utf-8") as report_json_file:
        report_json_file.write(
            JsonReport(
                tests=tests,
                stats_by_case=stats_by_case,
                global_stats=global_stats,
                prior_stats_by_case=prior_stats_by_case,
                prior_global_stats=prior_global_stats,
            ).model_dump_json(indent=2)
        )
