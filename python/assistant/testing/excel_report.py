import os

from typing import Literal

from pydantic import BaseModel, TypeAdapter
from xlsxwriter.format import Format
from xlsxwriter.utility import xl_rowcol_to_cell
from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from testing.framework.exceptions import CompileError, MatchError, ScoreError
from testing.models import QGReport, QueryInfo, Verdict


class XLSXReport:

    DEFAULT_STYLE_DICT = {"font_name": "Consolas", "font_size": "11"}

    def __init__(
        self,
        file_name: str = "report.xlsx",
        share_link: str | None = None,
        report_folder: str | None = None,
    ) -> None:
        self.workbook = Workbook(file_name)

        self.share_link = share_link
        self.report_folder = report_folder

        self._summary_line = 0
        self._details_line = 0

        self._statistic = ReportStatistic()

        self._summary_hyperlinks: dict[str, str] = {}

        self.summary_sheet = self.workbook.add_worksheet("Summary")
        self._prepare_summary_sheet(self.summary_sheet)

        self.details_sheet = self.workbook.add_worksheet("Details")
        self._prepare_details_sheet(self.details_sheet)

    def write(self, tests: dict[str, list[QGReport]]) -> None:
        sorted_tests: list[tuple[str, list[QGReport]]] = sorted(
            tests.items(), key=lambda x: x[0]
        )

        for case_name, case_reports in sorted_tests:
            if case_reports[-1].status != "skipped":
                self._write_details_case(case_name, case_reports)

            self._write_summary_case(case_name, case_reports)
            self._update_statistic(case_reports)

        self._summary_line += 1

    def __enter__(self) -> "XLSXReport":
        return self

    def __exit__(self, _, __, ___) -> None:
        self._write_legend()
        self._summary_line += 1

        self._write_links(self.share_link, self.report_folder)
        self._summary_line += 1

        self._write_statistic()
        self._summary_line += 1

        self._write_env_variables()
        self._summary_line += 1

        self.workbook.close()

    # region Style Properties

    @property
    def default_style(self) -> Format:
        return self.workbook.add_format(self.DEFAULT_STYLE_DICT)

    @property
    def enum_style(self) -> Format:
        enum_style = self.default_style

        enum_style.set_align("center")
        enum_style.set_bold(True)

        return enum_style

    @property
    def header_style(self) -> Format:
        header_style = self.default_style

        header_style.set_align("center")
        header_style.set_bold(True)
        header_style.set_bottom(2)

        return header_style

    @staticmethod
    def apply_color(style: Format, status: Verdict | Literal["skipped"]) -> Format:
        match status:
            case Verdict.PASSED:
                style.set_bg_color("#C0F1C8")
            case Verdict.FAILED:
                style.set_bg_color("#F1A983")
            case "skipped":
                style.set_bg_color("#D9D9D9")
            case Verdict.PARTIAL:
                style.set_bg_color("#F2DA83")

        return style

    # endregion

    def _write_legend(self) -> None:
        self.summary_sheet.merge_range(
            self._summary_line,
            2,
            self._summary_line,
            20,
            "Legend",
            self.header_style,
        )

        self._summary_line += 1

        def _write_legend_meaning(
            status: Verdict | Literal["skipped"], symbol: str, meaning: str
        ) -> None:
            style = self.apply_color(self.default_style, status)
            self.summary_sheet.write(self._summary_line, 2, symbol, style)
            self.summary_sheet.merge_range(
                self._summary_line,
                3,
                self._summary_line,
                20,
                meaning,
                self.default_style,
            )

            self._summary_line += 1

        _status: Verdict | Literal["skipped"]
        for _status, _symbol, _meaning in (
            (Verdict.PASSED, "OK", "Test passed"),
            (Verdict.PASSED, "#N", "Test passed with N attempts"),
            (Verdict.FAILED, "CE", "Compilation error"),
            (Verdict.FAILED, "ME", "Matching error (assertions failed)"),
            (Verdict.FAILED, "SE", "Score error (LLM scored answer as incorrect)"),
            (Verdict.FAILED, "RE", "Runtime error (in bot)"),
            ("skipped", "SK", "Test skipped"),
            (Verdict.PARTIAL, "PT", "Partial"),
        ):
            _write_legend_meaning(_status, _symbol, _meaning)

    def _write_links(self, share_link: str | None, report_folder: str | None) -> None:
        if share_link is not None:
            self.summary_sheet.write_url(
                self._summary_line,
                0,
                share_link,
                cell_format=self.default_style,
                string="DIAL XL Share Link (CTRL + Click)",
            )

            self._summary_line += 1

        if report_folder is not None:
            self.summary_sheet.write(
                self._summary_line,
                0,
                report_folder,
                self.default_style,
            )

            self._summary_line += 1

    def _write_statistic(self) -> None:
        self.summary_sheet.merge_range(
            self._summary_line,
            0,
            self._summary_line,
            20,
            "Statistic",
            self.header_style,
        )

        self._summary_line += 1

        def _write_statistic_value(name: str, value: str) -> None:
            self.summary_sheet.write(self._summary_line, 0, name, self.default_style)
            self.summary_sheet.write(self._summary_line, 1, value, self.default_style)
            self._summary_line += 1

        _write_statistic_value(
            "Unique test cases:", str(self._statistic.total_test_case_count)
        )

        total_success_rate = (
            self._statistic.success_test_count / self._statistic.total_test_count
        )

        _write_statistic_value(
            "Total success rate (across all runs):",
            f"{total_success_rate * 100:.2f}%",
        )

        partial_success_rate = (
            self._statistic.partial_success_case_count
            / self._statistic.total_test_case_count
        )

        _write_statistic_value(
            "Partial success rate (at least one run is OK):",
            f"{partial_success_rate * 100:.2f}%",
        )

        full_success_rate = (
            self._statistic.full_success_case_count
            / self._statistic.total_test_case_count
        )

        _write_statistic_value(
            "Full success rate (all runs are OK):", f"{full_success_rate * 100:.2f}%"
        )

    def _write_env_variables(self) -> None:
        def _write_variable(name: str) -> None:
            value = os.environ.get(name, "")
            self.summary_sheet.write(self._summary_line, 0, name, self.default_style)
            self.summary_sheet.merge_range(
                self._summary_line, 2, self._summary_line, 20, value, self.default_style
            )

            self._summary_line += 1

        self.summary_sheet.merge_range(
            self._summary_line,
            0,
            self._summary_line,
            20,
            "Env Variables",
            self.header_style,
        )

        self._summary_line += 1

        # TODO: Eliminate duplicated ENV Variables (i.e. CORE_MODEL and LLM_NAME)
        for env_name in (
            "BOT_VERSION",
            "CORE_MODEL",
            "LLM_NAME",
            "CLASSIFICATION_MODEL",
            "LLM_HINT_SELECTION_NAME",
            "MAX_FIX_ATTEMPTS",
        ):
            _write_variable(env_name)

    def _write_summary_case(self, name: str, reports: list[QGReport]) -> None:
        test_cell_style = self.apply_color(
            self.default_style, QGReport.general_status(reports)
        )

        summary_time = sum(
            (item.time for item in reports[-1].queries),
            start=0.0,
        )

        if name in self._summary_hyperlinks:
            self.summary_sheet.write_url(
                self._summary_line,
                0,
                self._summary_hyperlinks[name],
                cell_format=test_cell_style,
                string=f"{name} [{summary_time:.1f}s.]",
            )
        else:
            self.summary_sheet.write(
                self._summary_line,
                0,
                f"{name} [{summary_time:.1f}s.]",
                test_cell_style,
            )

        for run_index, report in enumerate(reports):
            self._write_summary_report(run_index, report)

        self._summary_line += 1

    def _write_summary_report(self, run_index: int, report: QGReport) -> None:
        run_cell_style = self.apply_color(self.default_style, report.status)

        match report.status:
            case Verdict.PASSED:
                error_count = sum([info.error_count for info in report.queries])
                self.summary_sheet.write(
                    self._summary_line,
                    run_index + 2,
                    "OK" if error_count == 0 else "#" + str(error_count),
                    run_cell_style,
                )

            case Verdict.FAILED:
                verdict_code = self._get_verdict_code(report.exception_name)
                self.summary_sheet.write(
                    self._summary_line, run_index + 2, verdict_code, run_cell_style
                )

            case "skipped":
                self.summary_sheet.write(
                    self._summary_line, run_index + 2, "SK", run_cell_style
                )

            case Verdict.PASSED:
                self.summary_sheet.write(
                    self._summary_line, run_index + 2, "PT", run_cell_style
                )

    @staticmethod
    def _get_verdict_code(exception_name: str | None) -> str:
        match exception_name:
            case CompileError.__name__:
                return "CE"
            case MatchError.__name__:
                return "ME"
            case ScoreError.__name__:
                return "SE"

        return "RE"

    def _write_details_case(self, name: str, reports: list[QGReport]) -> None:
        self._write_details_sheet_test_header(name, reports)

        for run_index, report in enumerate(reports):
            self._write_details_report(run_index, report)

    def _write_details_sheet_test_header(
        self, name: str, reports: list[QGReport]
    ) -> None:
        header_style = self.apply_color(
            self.header_style, QGReport.general_status(reports)
        )

        header_style.set_align("left")

        self.details_sheet.merge_range(
            self._details_line, 0, self._details_line, 3, name, header_style
        )

        self._summary_hyperlinks[name] = (
            f"internal:Details!" f"{xl_rowcol_to_cell(self._details_line, 0)}"
        )

        self._details_line += 1

    def _write_details_report(self, run_index: int, report: QGReport) -> None:
        run_index_style = self.apply_color(self.enum_style, report.status)
        self.details_sheet.write(self._details_line, 0, run_index, run_index_style)

        for query_index, query_info in enumerate(report.queries):
            self._write_details_query(query_index, query_info, report.status)

        query_cell_style = self.apply_color(self.default_style, report.status)

        # region Write Exception

        if report.exception_name is not None:
            self.details_sheet.write(
                self._details_line, 2, "Exception:", query_cell_style
            )

            if report.exception_name == CompileError.__name__:
                self.details_sheet.write(
                    self._details_line, 3, report.exception_message, query_cell_style
                )

            elif report.exception_name == MatchError.__name__:
                self.details_sheet.write(
                    self._details_line, 3, report.exception_message, query_cell_style
                )
            elif report.exception_name == ScoreError.__name__:
                self.details_sheet.write(
                    self._details_line, 3, report.exception_message, run_index_style
                )
            else:
                message = f"{report.exception_name}: {report.exception_message}"
                self.details_sheet.write(
                    self._details_line, 3, message, query_cell_style
                )

            self._details_line += 1

        # endregion

        self._details_line += 1

    def _write_details_query(
        self,
        query_index: int,
        query_info: QueryInfo,
        status: Verdict | Literal["skipped"],
    ) -> None:
        query_index_style = self.apply_color(self.enum_style, status)
        self.details_sheet.write(self._details_line, 1, query_index, query_index_style)

        # region Write User Query

        query_cell_style = self.apply_color(self.default_style, status)
        self.details_sheet.write(self._details_line, 2, "Query:", query_cell_style)
        self.details_sheet.write(
            self._details_line, 3, query_info.query, query_cell_style
        )

        self._details_line += 1

        # endregion
        # region Write Stages

        if len(query_info.stages):
            self._details_line += 1

        for stage in query_info.stages:
            self.details_sheet.write(
                self._details_line,
                2,
                stage.name,
                query_cell_style,
            )

            self.details_sheet.write(
                self._details_line,
                3,
                stage.content,
                query_cell_style,
            )

            self._details_line += 1

            if len(stage.attachments):
                serialized = (
                    TypeAdapter(dict[str, str])
                    .dump_json(stage.attachments, indent=2)
                    .decode("utf-8")
                )

                self.details_sheet.write(
                    self._details_line,
                    3,
                    serialized,
                    query_cell_style,
                )

                self._details_line += 1

        if len(query_info.stages):
            self._details_line += 1

        # endregion
        # region Write Post-Extracted Actions

        self.details_sheet.write(self._details_line, 2, "Actions:", query_cell_style)
        for action in query_info.actions:
            self.details_sheet.write(
                self._details_line,
                3,
                action.model_dump_json(indent=2),
                query_cell_style,
            )

            self._details_line += 1

        # endregion
        # region Write LLM Answer

        self.details_sheet.write(self._details_line, 2, "Answer:", query_cell_style)
        self.details_sheet.write(
            self._details_line, 3, query_info.text, query_cell_style
        )

        self._details_line += 1

        # endregion
        # region Write Final State Compilation Error

        if len(query_info.compilation_errors):
            self.details_sheet.write(
                self._details_line, 2, "XL Compilation Errors:", query_cell_style
            )

            for error in query_info.compilation_errors:
                self.details_sheet.write(self._details_line, 3, error, query_cell_style)
                self._details_line += 1

        # endregion
        # region Write LLM Assistant Score

        if query_info.llm_score.verdict != Verdict.PASSED:
            self.details_sheet.write(
                self._details_line, 2, "LLM Score:", query_cell_style
            )

            score_text = (
                f"{query_info.llm_score.verdict}. {query_info.llm_score.explanation}"
            )

            self.details_sheet.write(
                self._details_line, 3, score_text, query_cell_style
            )

            self._details_line += 1

        # endregion
        # region Write Failed Stages Count

        if query_info.error_count:
            self.details_sheet.write(
                self._details_line, 2, "Failed Attempts:", query_cell_style
            )

            self.details_sheet.write(
                self._details_line, 3, str(query_info.error_count), query_cell_style
            )

            self._details_line += 1

        # endregion

    def _update_statistic(self, reports: list[QGReport]) -> None:
        is_runs_present = False
        is_full_success = True
        is_partial_success = False

        for report in reports:
            if report.status == "skipped":
                continue

            is_runs_present = True
            self._statistic.total_test_count += 1

            if report.status == Verdict.PASSED:
                is_partial_success = True
                self._statistic.success_test_count += 1
            else:
                is_full_success = False

        self._statistic.total_test_case_count += is_runs_present
        self._statistic.full_success_case_count += is_full_success and is_runs_present
        self._statistic.partial_success_case_count += is_partial_success

    def _prepare_summary_sheet(self, sheet: Worksheet) -> None:
        sheet.write(self._summary_line, 0, "Case", self.header_style)
        sheet.write(self._summary_line, 1, "", self.header_style)

        sheet.set_column_pixels(2, 20, width=20)
        for i in range(0, 19):
            sheet.write(self._summary_line, 2 + i, f"{i + 1}", self.header_style)

        sheet.set_column(0, 0, width=140)

        self._summary_line += 1

    @staticmethod
    def _prepare_details_sheet(sheet: Worksheet) -> None:
        sheet.set_column_pixels(0, 1, width=20)
        sheet.set_column_pixels(2, 2, width=256)
        sheet.set_column_pixels(3, 3, width=8192)


class ReportStatistic(BaseModel):
    total_test_case_count: int = 0
    full_success_case_count: int = 0
    partial_success_case_count: int = 0

    total_test_count: int = 0
    success_test_count: int = 0
