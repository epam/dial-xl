import asyncio
import dataclasses
import datetime
import os
import re
import threading
import uuid

from typing import Any, Literal, cast

import xdist

from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from pytest import (
    CallInfo,
    Config,
    ExitCode,
    Item,
    Session,
    StashKey,
    TestReport,
    hookimpl,
)

from quantgrid.configuration import LOGGER
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import ProjectUtil
from testing.excel_report import XLSXReport
from testing.models import QGReport, QueryInfo, Verdict
from testing.quantgrid_report import generate_quantgrid_report

pytest_plugins = ["testing.environments"]


def _get_user_property(properties: list[tuple[str, Any]], key: str) -> Any:
    matching = [value for k, value in properties if k == key]
    if len(matching) != 1:
        raise ValueError(f"Expected exactly one user property, got {matching}.")

    return matching[0]


@dataclasses.dataclass
class TestEnv:
    dial_url: str
    agent_dial_url: str
    dial_api_key: str

    qg_url: str
    qg_api_key: str

    report_folder: str
    report_data_folder: str
    dial_api_client: DIALApi
    quantgrid_api_client: Client


LOCAL = threading.local()
QUANTGRID_REPORTS_KEY = StashKey[dict[str, list[QGReport]]]()
ENVIRONMENT_KEY = StashKey[TestEnv]()
START_TIME: str = "start_time"


def load_environment(config: Config, start_time: str | None = None) -> TestEnv:

    if ENVIRONMENT_KEY in config.stash:
        return config.stash[ENVIRONMENT_KEY]

    # We expect load_environment to be initialized in pytest_configure (having start_time set)
    # All other calls expected to return object from stash.
    assert start_time

    dial_url = os.getenv("DIAL_URL")
    agent_dial_url = os.getenv("AGENT_DIAL_URL")
    dial_api_key = os.getenv("DIAL_API_KEY")

    qg_url = os.getenv("QG_URL")
    qg_api_key = os.getenv("QG_API_KEY")

    for name, variable in [("QG_URL", qg_url), ("QG_API_KEY", qg_api_key)]:
        if not variable:
            raise ValueError(
                f"Test runner expected {name} environment variable to be set."
            )

    for name, variable in [
        ("DIAL_URL", dial_url),
        ("AGENT_DIAL_URL", agent_dial_url),
        ("DIAL_API_KEY", dial_api_key),
    ]:
        if not variable:
            raise ValueError(
                f"Test runner expected {name} environment variable to be set."
            )

    credential = ApiKey(cast(str, dial_api_key))
    dial_api_client = DIALApi(cast(str, dial_url), credential)
    bucket = asyncio.run(dial_api_client.bucket())

    config.stash[ENVIRONMENT_KEY] = TestEnv(
        dial_url=cast(str, dial_url),
        agent_dial_url=cast(str, agent_dial_url),
        dial_api_key=cast(str, dial_api_key),
        qg_url=cast(str, qg_url),
        qg_api_key=cast(str, qg_api_key),
        dial_api_client=dial_api_client,
        quantgrid_api_client=Client(cast(str, qg_url), cast(str, dial_url), credential),
        report_folder=f"files/{bucket}/auto_test_{start_time}",
        report_data_folder=f"files/{bucket}/appdata/xl/auto_test_{start_time}",
    )

    return config.stash[ENVIRONMENT_KEY]


# Called by pytest in master process
# And then once in every worker process.
def pytest_configure(config: Config):
    LOCAL.CONFIG = config
    LOCAL.UUID = uuid.uuid4().hex

    config.stash[QUANTGRID_REPORTS_KEY] = {}

    session = config.pluginmanager.get_plugin("session")
    is_worker = xdist.get_xdist_worker_id(session) != "master"
    if is_worker:
        assert config.pluginmanager.getplugin("xdist")
        start_time = config.workerinput[START_TIME]  # type: ignore[attr-defined]
    else:
        now = datetime.datetime.now(datetime.UTC)
        start_time = f'{now.strftime("%Y%m%d_%H_%M_%S")}'
        # Save in master config to populate into workers later in pytest_configure_node
        config.stash[START_TIME] = start_time  # type: ignore[index]

    load_environment(config, start_time)

    run_count = os.getenv("PYTEST_TEST_RUNS", "2")
    if config.option.count is not None:
        config.option.count = int(run_count)


def strip_test_indexing(node_id: str) -> str:
    result = re.sub(r"\[\d+-\d+]", "", node_id)
    result = "".join(char if char.isalnum() else "_" for char in result).replace(
        "__", "_"
    )
    return result


@hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: Item, call: CallInfo) -> Any:
    result = yield
    report: TestReport = result.get_result()
    if report.when != "call":
        return report

    queries: list[QueryInfo] = getattr(item, "queries")
    project_id = getattr(item, "project_id")
    ai_hints: list[str] = getattr(item, "ai_hint")

    report_status: Verdict | Literal["skipped"] = cast(
        Verdict | Literal["skipped"], report.outcome
    )
    if report_status == Verdict.PASSED and any(
        query.llm_score.verdict == Verdict.PARTIAL for query in queries
    ):
        report_status = Verdict.PARTIAL

    report.user_properties.append(
        (
            "quantgrid_report",
            QGReport(
                name=project_id,
                status=(
                    Verdict(report_status) if report_status != "skipped" else "skipped"
                ),
                ai_hints_text=(
                    f"[{','.join([h for h in ai_hints])}]"
                    if len(ai_hints) > 0
                    else None
                ),
                exception_name=(
                    call.excinfo.typename if call.excinfo is not None else None
                ),
                exception_message=(
                    f'{call.excinfo.value}\n{call.excinfo.getrepr(False, "short")}'
                    if call.excinfo is not None
                    else None
                ),
                queries=queries,
            ).model_dump_json(),
        )
    )

    return report


@hookimpl(hookwrapper=True)
def pytest_runtest_logreport(report: TestReport):

    config: Config = LOCAL.CONFIG

    session = config.pluginmanager.get_plugin("session")
    is_worker = xdist.get_xdist_worker_id(session) != "master"

    if report.when != "call" or is_worker:
        return (yield)

    quantgrid_report: QGReport = QGReport.model_validate_json(
        _get_user_property(report.user_properties, "quantgrid_report")
    )

    config.stash[QUANTGRID_REPORTS_KEY].setdefault(quantgrid_report.name, []).append(
        quantgrid_report
    )

    return (yield)


@hookimpl(hookwrapper=True)
def pytest_sessionfinish(session: Session, exitstatus: ExitCode):
    if xdist.get_xdist_worker_id(session) != "master":
        return (yield)

    environment = session.config.stash[ENVIRONMENT_KEY]
    share_link = generate_quantgrid_report(
        ProjectUtil(environment.quantgrid_api_client),
        environment.dial_api_client,
        environment.report_folder,
        environment.report_data_folder,
        session.config.stash[QUANTGRID_REPORTS_KEY],
    )

    LOGGER.info(f"Share Link: {share_link}")

    with XLSXReport("report.xlsx", share_link, environment.report_folder) as report:
        report.write(session.config.stash[QUANTGRID_REPORTS_KEY])

    if os.getenv("PYTEST_OPEN_REPORT", "True").lower() != "true":
        return (yield)

    if os.name == "posix":
        os.system("open report.xlsx")  # type: ignore[attr-defined]
    elif os.name == "nt":
        os.startfile("report.xlsx")  # type: ignore[attr-defined]

    return (yield)


# this is xdist hook that run once per worker but inside master process.
# The call order is the following:
# pytest calls pytest_configure inside master process. And then init pytest-xdist
#   pytest-xdist sequentially calls pytest_configure_node inside master process for every node.
#      pytest calls pytest_configure again but this time inside worker processes in parallel.
def pytest_configure_node(node):
    assert START_TIME in node.config.stash
    # populate setting to worker
    node.workerinput[START_TIME] = node.config.stash[START_TIME]
