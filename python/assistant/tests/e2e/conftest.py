import asyncio
import datetime
import logging
import os
import threading
import uuid

from typing import TYPE_CHECKING, Any, Literal, cast

import pytest
import xdist

from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from public import private
from xdist.workermanage import WorkerController

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.loading.load_dynaconf import load_dynaconf
from tests.config import TestConfig
from tests.e2e.env import TestEnv
from tests.e2e.excel_report import XLSXReport
from tests.e2e.json_report import write_json_report
from tests.e2e.models.qg_report import QGReport
from tests.e2e.models.verdict import Verdict
from tests.e2e.quantgrid_report import generate_quantgrid_report
from tests.e2e.utils.dial.dial_api import DIALApi
from tests.e2e.utils.stats.history import (
    TestType,
    build_history_and_estimate_sample_size,
    get_stats_with_fisher_pvalue_for_report,
)
from tests.e2e.utils.stats.structs import CaseStats, GlobalStats

if TYPE_CHECKING:
    from tests.e2e.models.query_info import QueryInfo

LOGGER = logging.getLogger(__name__)

pytest_plugins = ["tests.e2e.environments"]

LOCAL = threading.local()

QUANTGRID_REPORTS_KEY = pytest.StashKey[dict[str, list[QGReport]]]()
HISTORY_KEY = pytest.StashKey[dict[str, list[float]]]()
HISTORY_COMMITS_KEY = pytest.StashKey[set[str]]()
FRACTION_FAILED_KEY = pytest.StashKey[float]()
PRIOR_GLOBAL_STATS_KEY = pytest.StashKey[GlobalStats]()
PRIOR_STATS_BY_CASE_KEY = pytest.StashKey[dict[str, CaseStats]]()
ENVIRONMENT_KEY = pytest.StashKey[TestEnv]()

RUN_COUNT_KEY: str = "run_count"
START_TIME: str = "start_time"


def load_environment(config: pytest.Config, start_time: str | None = None) -> TestEnv:
    if ENVIRONMENT_KEY in config.stash:
        return config.stash[ENVIRONMENT_KEY]

    # We expect load_environment to be initialized
    #   in pytest_configure (having start_time set).
    # All other calls expected to return object from stash.
    assert start_time

    dynaconf = load_dynaconf()

    assistant_config = AssistantConfig.model_validate(dynaconf.assistant.to_dict())
    test_config = TestConfig.model_validate(dynaconf.test.to_dict())

    credential = ApiKey(test_config.api_key.get_secret_value())

    dial_client = DIALApi(assistant_config.url.dial, credential)
    xl_client = Client(assistant_config.url.xl, assistant_config.url.dial, credential)

    bucket = asyncio.run(dial_client.bucket())

    config.stash[ENVIRONMENT_KEY] = TestEnv(
        assistant_config=assistant_config,
        test_config=test_config,
        dial_client=dial_client,
        xl_client=xl_client,
        report_folder=f"files/{bucket}/auto_test_{start_time}",
        report_data_folder=f"files/{bucket}/appdata/xl/auto_test_{start_time}",
    )

    return config.stash[ENVIRONMENT_KEY]


# Called by pytest in master process
# And then once in every worker process.
def pytest_configure(config: pytest.Config) -> None:
    LOCAL.CONFIG = config
    LOCAL.UUID = uuid.uuid4().hex

    config.stash[QUANTGRID_REPORTS_KEY] = {}

    session = config.pluginmanager.get_plugin("session")
    is_worker = xdist.get_xdist_worker_id(session) != "master"
    if is_worker:
        assert config.pluginmanager.getplugin("xdist")
        start_time = config.workerinput[START_TIME]  # type: ignore[attr-defined]
        int_run_count = config.workerinput[RUN_COUNT_KEY]  # type: ignore[attr-defined]
    else:
        now = datetime.datetime.now(datetime.UTC)
        start_time = f"{now.strftime('%Y%m%d_%H_%M_%S')}"
        # Save in master config to populate into workers later in pytest_configure_node
        config.stash[START_TIME] = start_time  # type: ignore[index]
        test_type = cast("TestType", os.getenv("PYTEST_TEST_TYPE", "integration"))
        input_run_count = int(os.getenv("RUN_COUNT", "-1").strip())
        fraction_failed = 0.33 if test_type == "integration" else 0.5
        (
            history,
            run_count,
            history_commits,
            (prior_global_stats, prior_stats_by_case),
        ) = build_history_and_estimate_sample_size(test_type, fraction_failed)
        int_run_count = int(run_count) if input_run_count == -1 else input_run_count
        print("Run count:", int_run_count)
        config.stash[HISTORY_KEY] = history
        config.stash[HISTORY_COMMITS_KEY] = history_commits
        config.stash[FRACTION_FAILED_KEY] = fraction_failed
        config.stash[PRIOR_GLOBAL_STATS_KEY] = prior_global_stats
        config.stash[PRIOR_STATS_BY_CASE_KEY] = prior_stats_by_case
        config.stash[RUN_COUNT_KEY] = int_run_count  # type: ignore[index]

    load_environment(config, start_time)
    config.option.count = int(int_run_count)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[Any]) -> Any:
    result = yield
    report: pytest.TestReport = result.get_result()
    if report.when != "call":
        return report

    queries: list[QueryInfo] = item.queries  # type: ignore[attr-defined]
    ai_hints: list[str] = item.ai_hint  # type: ignore[attr-defined]
    test_name: str = item.test_name  # type: ignore[attr-defined]
    test_index: int = item.test_index  # type: ignore[attr-defined]

    report_status: Verdict | Literal["skipped"] = cast(
        "Verdict | Literal['skipped']", report.outcome
    )
    if report_status == Verdict.PASSED and any(
        query.llm_score.verdict == Verdict.PARTIAL for query in queries
    ):
        report_status = Verdict.PARTIAL

    report.user_properties.append(
        (
            "quantgrid_report",
            QGReport(
                name=test_name,
                index=test_index,
                status=(
                    Verdict(report_status) if report_status != "skipped" else "skipped"
                ),
                ai_hints_text=(
                    f"[{','.join(ai_hints)}]" if len(ai_hints) > 0 else None
                ),
                exception_name=(
                    call.excinfo.typename if call.excinfo is not None else None
                ),
                exception_message=(
                    f"{call.excinfo.value}\n"
                    f"{call.excinfo.getrepr(showlocals=False, style='short')}"
                    if call.excinfo is not None
                    else None
                ),
                queries=queries,
            ).model_dump_json(),
        )
    )

    return report


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_logreport(report: pytest.TestReport) -> Any:
    config: pytest.Config = LOCAL.CONFIG

    session = config.pluginmanager.get_plugin("session")
    is_worker = xdist.get_xdist_worker_id(session) != "master"

    if report.when != "call" or is_worker:
        return (yield)

    quantgrid_report: QGReport = QGReport.model_validate_json(
        get_user_property(report.user_properties, "quantgrid_report")
    )

    config.stash[QUANTGRID_REPORTS_KEY].setdefault(quantgrid_report.name, []).append(
        quantgrid_report
    )

    return (yield)


@pytest.hookimpl(hookwrapper=True)
def pytest_sessionfinish(session: pytest.Session) -> Any:
    if xdist.get_xdist_worker_id(session) != "master":
        return (yield)

    environment = session.config.stash[ENVIRONMENT_KEY]
    share_link = generate_quantgrid_report(
        environment.xl_client,
        environment.dial_client,
        environment.assistant_config,
        environment.report_folder,
        environment.report_data_folder,
        session.config.stash[QUANTGRID_REPORTS_KEY],
    )

    LOGGER.info(f"Share Link: {share_link}")
    global_stats, stats_by_case = get_stats_with_fisher_pvalue_for_report(
        history=session.config.stash[HISTORY_KEY],
        current_report=session.config.stash[QUANTGRID_REPORTS_KEY],
        history_commits=session.config.stash[HISTORY_COMMITS_KEY],
        fraction_failed=session.config.stash[FRACTION_FAILED_KEY],
    )

    with XLSXReport("report.xlsx", share_link, environment.report_folder) as report:
        report.write(
            tests=session.config.stash[QUANTGRID_REPORTS_KEY],
            global_stats=global_stats,
            stats_by_case=stats_by_case,
            prior_stats_by_case=session.config.stash[PRIOR_STATS_BY_CASE_KEY],
        )

    write_json_report(
        file_name="report.json",
        tests=session.config.stash[QUANTGRID_REPORTS_KEY],
        global_stats=global_stats,
        stats_by_case=stats_by_case,
        prior_global_stats=session.config.stash[PRIOR_GLOBAL_STATS_KEY],
        prior_stats_by_case=session.config.stash[PRIOR_STATS_BY_CASE_KEY],
    )

    if os.getenv("PYTEST_OPEN_REPORT", "False").lower() != "true":
        return (yield)

    if os.name == "posix":
        os.system("open report.xlsx")
    elif os.name == "nt":
        os.startfile("report.xlsx")

    return (yield)


# This is xdist hook that run once per worker but inside master process.
# The call order is the following:
# 1. pytest calls pytest_configure inside master process.
# 2. pytest init pytest-xdist.
# 3. pytest-xdist sequentially calls pytest_configure_node
#   inside master process for every node.
# 4. pytest calls pytest_configure again but this time
#   inside worker processes in parallel.
def pytest_configure_node(node: WorkerController) -> None:
    assert START_TIME in node.config.stash
    node.workerinput[START_TIME] = node.config.stash[START_TIME]

    assert RUN_COUNT_KEY in node.config.stash
    node.workerinput[RUN_COUNT_KEY] = node.config.stash[RUN_COUNT_KEY]


@private
def get_user_property(properties: list[tuple[str, Any]], key: str) -> Any:
    matching = [value for k, value in properties if k == key]
    if len(matching) != 1:
        message = f"Expected exactly one user property, got {matching}."
        raise ValueError(message)

    return matching[0]
