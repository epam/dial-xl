import asyncio
import logging

from dial_xl.client import Client

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.utils.xl.create import create_project
from tests.e2e.models.qg_report import QGReport
from tests.e2e.utils.dial.dial_api import DIALApi

LOGGER = logging.getLogger(__name__)


async def async_report(
    client: Client,
    api: DIALApi,
    report_folder: str,
    report_data_folder: str,
    reports: dict[str, list[QGReport]],
) -> str:
    await api.create_folder(report_folder)

    for test_report in reports.values():
        for report in test_report:
            if not len(report.queries):
                continue

            name = f"{report.status.upper()}-{report.name}[{report.index}]"
            hint_path = f"{report_data_folder}/{name}/.hints.ai"

            if report.ai_hints_text:
                await api.create_file(hint_path, ".hints.ai", report.ai_hints_text)

            project = await create_project(
                client, f"{report_folder}/{name}.qg", report.queries[-1].sheets
            )

            await project.save()

    link = await api.share([report_folder + "/", report_data_folder + "/"])
    return link.replace("v1/invitations/", "").strip("/")


def generate_quantgrid_report(
    client: Client,
    api: DIALApi,
    assistant_config: AssistantConfig,
    report_folder: str,
    report_data_folder: str,
    reports: dict[str, list[QGReport]],
) -> str | None:
    if not len(reports):
        LOGGER.info("No reports where generated. Quantgrid folder creation cancelled.")
        return None

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        return (
            assistant_config.url.xl
            + "/share/"
            + loop.run_until_complete(
                async_report(client, api, report_folder, report_data_folder, reports)
            )
        )
    except Exception:
        LOGGER.exception("Failed to share test results.")
    finally:
        loop.close()

    return None
