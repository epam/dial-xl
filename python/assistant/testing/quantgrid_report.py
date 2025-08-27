import asyncio

from quantgrid.configuration import LOGGER, Env
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import ProjectUtil
from testing.models import QGReport


async def async_report(
    util: ProjectUtil,
    api: DIALApi,
    report_folder: str,
    report_data_folder: str,
    reports: dict[str, list[QGReport]],
) -> str:
    await api.create_folder(report_folder)

    for test_report in reports.values():
        for i, report in enumerate(test_report):
            if not len(report.queries):
                continue

            name = f"{report.status.upper()}-{report.name}[{report.index}]"
            hint_path = f"{report_data_folder}/{name}/.hints.ai"

            if report.ai_hints_text:
                await api.create_file(hint_path, ".hints.ai", report.ai_hints_text)

            project = await util.create_project_from_code(
                f"{report_folder}/{name}.qg", report.queries[-1].sheets
            )
            await project.save()

    link = await api.share([report_folder + "/", report_data_folder + "/"])
    return link.replace("v1/invitations/", "").strip("/")


def generate_quantgrid_report(
    util: ProjectUtil,
    api: DIALApi,
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
            Env.QG_URL
            + "/share/"
            + loop.run_until_complete(
                async_report(util, api, report_folder, report_data_folder, reports)
            )
        )
    except Exception as exception:
        LOGGER.exception(exception)
    finally:
        loop.close()

    return None
