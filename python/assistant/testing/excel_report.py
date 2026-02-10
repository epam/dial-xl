import os
import statistics

from pydantic import BaseModel, TypeAdapter
from xlsxwriter.format import Format
from xlsxwriter.utility import xl_rowcol_to_cell
from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from quantgrid_1.models.stage import Attachment
from testing.exceptions import CompileError, MatchError, MatchingError, ScoreError
from testing.models import QGReport, QueryInfo, Verdict
from testing.utils.stats import CaseStats, Conclusion, GlobalStats


class XLSXReport:

    DEFAULT_STYLE_DICT = {"font_name": "Consolas", "font_size": "11"}
    _CASE_RESULT_START_COLUMN = 4

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

        self.sha_sheet = self.workbook.add_worksheet("Commit SHA")
        self._prepare_details_sheet(self.sha_sheet)

    def write(
        self,
        tests: dict[str, list[QGReport]],
        global_stats: GlobalStats,
        stats_by_case: dict[str, CaseStats],
        prior_stats_by_case: dict[str, CaseStats],
    ) -> None:
        sorted_tests: list[tuple[str, list[QGReport]]] = sorted(
            tests.items(), key=lambda x: x[0]
        )

        for case_name, case_reports in sorted_tests:
            if case_reports[-1].status != "skipped":
                self._write_details_case(case_name, case_reports)

            self._write_summary_case(
                case_name,
                case_reports,
                stats_by_case[case_name] if case_name in stats_by_case else None,
                (
                    prior_stats_by_case[case_name]
                    if case_name in prior_stats_by_case
                    else None
                ),
            )
            self._update_statistic(case_reports)

        self._filter_lists()
        # if no scores were calculated, columns are made more narrow
        if not self._statistic.llm_score_runs_count:
            self.summary_sheet.set_column_pixels(first_col=2, last_col=2, width=20)
        if not self._statistic.redundancy_score_runs_count:
            self.summary_sheet.set_column_pixels(first_col=3, last_col=3, width=20)
        self._write_commit_shas(global_stats.history_commits)
        self._statistic.global_stats = global_stats
        self._summary_line += 1

    def _filter_lists(self):
        self._statistic.generation_avg_tokens = list(
            filter(lambda x: x is not None, self._statistic.generation_avg_tokens)
        )
        self._statistic.summary_avg_tokens = list(
            filter(lambda x: x is not None, self._statistic.summary_avg_tokens)
        )
        self._statistic.redundancy_avg_scores = list(
            filter(lambda x: x is not None, self._statistic.redundancy_avg_scores)
        )
        self._statistic.llm_avg_scores = list(
            filter(lambda x: x is not None, self._statistic.llm_avg_scores)
        )

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
    def apply_color(style: Format, status: Verdict | str) -> Format:
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

    @staticmethod
    def _get_avg_llm_score(reports: list[QGReport], key: str) -> dict | None:
        scores = [
            getattr(info, key).score
            for report in reports
            for info in report.queries
            if getattr(info, key) and getattr(info, key).score is not None
        ]
        # -1 as score means failed score calculation, it shouldn't be included into avg calculation
        successful_scores = [score for score in scores if score >= 0]
        if scores:
            scores_mean = (
                statistics.mean(successful_scores) if successful_scores else None
            )
            return {
                "scores_mean": scores_mean,
                "successful_scores_count": len(successful_scores),
                "total_scores_count": len(scores),
            }
        else:
            return None

    @staticmethod
    def _get_avg_tokens(reports: list[QGReport], key: str) -> float | None:
        reports_generation_output_tokens = []
        for report in reports:
            reports_generation_output_tokens += [
                int(stage.get_attachment(key).data)
                for query in report.queries
                for stage in query.stages
                if key in stage.attachment_titles
                and int(stage.get_attachment(key).data) > 0
            ]
        return (
            statistics.mean(reports_generation_output_tokens)
            if reports_generation_output_tokens
            else None
        )

    @staticmethod
    def _get_sum_tokens(reports: list[QGReport], key: str) -> float | None:
        counts = []
        for report in reports:
            counts += [
                int(stage.get_attachment(key).data)
                for query in report.queries
                for stage in query.stages
                if key in stage.attachment_titles
                and int(stage.get_attachment(key).data) > 0
            ]

        return sum(counts) if counts else None

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
            status: Verdict | str,
            symbol: str,
            meaning: str,
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

        _status: Verdict | str
        for _status, _symbol, _meaning in (
            (Verdict.PASSED, "OK", "Test passed"),
            (Verdict.PASSED, "#N", "Test passed with N attempts"),
            (Verdict.FAILED, "CE", "Compilation error"),
            (Verdict.FAILED, "ME", "Matching error (assertions failed)"),
            (Verdict.FAILED, "SE", "Score error (LLM scored answer as incorrect)"),
            (Verdict.FAILED, "RE", "Runtime error (in bot)"),
            ("skipped", "SK", "Test skipped"),
            (Verdict.PARTIAL, "PT", "Partial"),
            ("LLMS", "LLMS", "LLM fact check score"),
            ("RLLMS", "RLLMS", "Redundant facts LLM score"),
            ("GAAT", "GAAT", "Generate Actions average output tokens"),
            ("SAT", "SAT", "Summary average output tokens"),
            ("ITC", "ITC", "Input token count (total)"),
            ("OTC", "OTC", "Output token count (total)"),
            (
                "PREV PROBA",
                "PREV PROBA",
                CaseStats.model_fields["history_probability"].description or "",
            ),
            ("PROBA", "PROBA", CaseStats.model_fields["probability"].description or ""),
            ("PVAL", "PVAL", CaseStats.model_fields["pvalue"].description or ""),
            (
                "ALPHA",
                "ALPHA",
                str(self._statistic.global_stats.alpha)
                + ","
                + (GlobalStats.model_fields["alpha"].description or ""),
            ),
            ("BETA", "BETA", GlobalStats.model_fields["beta"].description or ""),
            (
                "DELTA",
                "DELTA",
                str(self._statistic.global_stats.delta)
                + ","
                + (GlobalStats.model_fields["delta"].description or ""),
            ),
            (
                "H_LEN",
                "H_LEN",
                CaseStats.model_fields["history_size"].description or "",
            ),
            (
                "R_LEN",
                "R_LEN",
                CaseStats.model_fields["size"].description or "",
            ),
            (
                "PRIOR",
                "PRIOR",
                "The PRIOR prefix indicates that the comparison is between the main commit at the time of the fork(prior commit) and the history",
            ),
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

        def _write_statistic_value(
            name: str, value: str, style=self.default_style
        ) -> None:
            self.summary_sheet.write(self._summary_line, 0, name, style)
            self.summary_sheet.write(self._summary_line, 1, value, style)
            self._summary_line += 1

        _write_statistic_value(
            "Unique test cases:", str(self._statistic.total_test_case_count)
        )

        total_success_rate = (
            (self._statistic.success_test_count / self._statistic.total_test_count)
            if self._statistic.total_test_count > 0
            else float("nan")
        )

        _write_statistic_value(
            "Total success rate (across all runs):",
            f"{total_success_rate * 100:.2f}%",
        )

        partial_success_rate = (
            (
                self._statistic.partial_success_case_count
                / self._statistic.total_test_case_count
            )
            if self._statistic.total_test_count > 0
            else float("nan")
        )

        _write_statistic_value(
            "Partial success rate (at least one run is OK):",
            f"{partial_success_rate * 100:.2f}%",
        )

        full_success_rate = (
            (
                self._statistic.full_success_case_count
                / self._statistic.total_test_case_count
            )
            if self._statistic.total_test_count > 0
            else float("nan")
        )

        _write_statistic_value(
            "Full success rate (all runs are OK):", f"{full_success_rate * 100:.2f}%"
        )

        llm_score_avg = (
            statistics.mean(self._statistic.llm_avg_scores)
            if self._statistic.llm_avg_scores
            else None
        )
        _write_statistic_value(
            f"Average llm score ({self._statistic.llm_score_runs_count}/{self._statistic.llm_score_max_runs_count} test cases):",
            str(llm_score_avg),
        )

        redundancy_score_avg = (
            statistics.mean(self._statistic.redundancy_avg_scores)
            if self._statistic.redundancy_avg_scores
            else None
        )
        _write_statistic_value(
            f"Average redundancy score ({self._statistic.redundancy_score_runs_count}/{self._statistic.redundancy_score_max_runs_count} test cases):",
            str(redundancy_score_avg),
        )

        generation_tokens_avg = (
            statistics.mean(self._statistic.generation_avg_tokens)
            if self._statistic.generation_avg_tokens
            else None
        )
        summary_tokens_avg = (
            statistics.mean(self._statistic.summary_avg_tokens)
            if self._statistic.summary_avg_tokens
            else None
        )
        _write_statistic_value(
            f"Average output tokens count (generate action tokens/summary tokens):",
            f"{generation_tokens_avg}/{summary_tokens_avg}",
        )
        if (
            self._statistic.global_stats.fisher_pvalue
            < self._statistic.global_stats.alpha
        ):
            if self._statistic.global_stats.n_higher < 0.5:
                if self._statistic.global_stats.n_lower < 0.5:
                    pvalue_verdict = "skipped"
                else:
                    pvalue_verdict = Verdict.FAILED
            else:
                if self._statistic.global_stats.n_lower < 0.5:
                    pvalue_verdict = Verdict.PASSED
                else:
                    pvalue_verdict = Verdict.PARTIAL
        else:
            pvalue_verdict = "skipped"
        _write_statistic_value(
            f"Combined p-value across all cases using Fisher's method to detect shift in {self._statistic.global_stats.fraction_failed * 100} % cases with alpha: {self._statistic.global_stats.alpha}, beta: {self._statistic.global_stats.beta}, delta: {self._statistic.global_stats.delta}(statistical significance may fail to be reached if the run count equals the maximum run count):",
            str(self._statistic.global_stats.fisher_pvalue),
            self.apply_color(self.default_style, pvalue_verdict),
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

    def _write_summary_case(
        self,
        name: str,
        reports: list[QGReport],
        stats: CaseStats | None,
        prior_stats: CaseStats | None,
    ) -> None:
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
        avg_llm_score_dict = XLSXReport._get_avg_llm_score(reports, "llm_score")
        if avg_llm_score_dict is not None:
            self.summary_sheet.write(
                self._summary_line,
                2,
                avg_llm_score_dict["scores_mean"],
                self.default_style,
            )
        avg_redundancy_score_dict = XLSXReport._get_avg_llm_score(
            reports, "redundancy_score"
        )
        if avg_redundancy_score_dict is not None:
            self.summary_sheet.write(
                self._summary_line,
                3,
                avg_redundancy_score_dict["scores_mean"],
                self.default_style,
            )
        for run_index, report in enumerate(reports):
            self._write_summary_report(run_index, report)

        avg_gen_output_tokens = XLSXReport._get_avg_tokens(
            reports, "generation_output_tokens"
        )
        self.summary_sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 20,
            avg_gen_output_tokens,
            self.default_style,
        )

        avg_summary_output_tokens = XLSXReport._get_avg_tokens(
            reports, "summary_output_tokens"
        )
        self.summary_sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 21,
            avg_summary_output_tokens,
            self.default_style,
        )

        sum_input_tokens = XLSXReport._get_sum_tokens(reports, "input_token_count")
        self.summary_sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 22,
            sum_input_tokens,
            self.default_style,
        )

        sum_output_token = XLSXReport._get_sum_tokens(reports, "output_token_count")
        self.summary_sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 23,
            sum_output_token,
            self.default_style,
        )

        if stats is not None:
            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 24,
                str(stats.history_probability),
                self.default_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 25,
                str(stats.probability),
                self.default_style,
            )
            pvalue_verdict: Verdict | str = "skipped"
            if (
                prior_stats is not None
                and (stats.conclusion == prior_stats.conclusion)
                and stats.conclusion != Conclusion.STABLE
            ):
                pvalue_verdict = Verdict.PARTIAL
            elif stats.conclusion == Conclusion.NEGATIVE_SHIFT:
                pvalue_verdict = Verdict.FAILED
            elif stats.conclusion == Conclusion.POSITIVE_SHIFT:
                pvalue_verdict = Verdict.PASSED
            pvalue_test_cell_style = self.apply_color(
                self.default_style, pvalue_verdict
            )
            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 26,
                str(stats.pvalue),
                pvalue_test_cell_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 27,
                str(stats.beta),
                self.default_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 28,
                str(stats.history_size),
                self.default_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 29,
                str(stats.size),
                self.default_style,
            )
        if prior_stats is not None:
            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 31,
                str(prior_stats.history_probability),
                self.default_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 32,
                str(prior_stats.probability),
                self.default_style,
            )
            prior_pvalue_verdict: Verdict | str = "skipped"
            if prior_stats.conclusion == Conclusion.NEGATIVE_SHIFT:
                prior_pvalue_verdict = Verdict.FAILED
            elif prior_stats.conclusion == Conclusion.POSITIVE_SHIFT:
                prior_pvalue_verdict = Verdict.PASSED
            pvalue_test_cell_style = self.apply_color(
                self.default_style, prior_pvalue_verdict
            )
            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 33,
                str(prior_stats.pvalue),
                pvalue_test_cell_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 34,
                str(prior_stats.beta),
                self.default_style,
            )

            self.summary_sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + 35,
                str(prior_stats.size),
                self.default_style,
            )

        self._summary_line += 1

    def _write_summary_report(self, run_index: int, report: QGReport) -> None:
        run_cell_style = self.apply_color(self.default_style, report.status)

        match report.status:
            case Verdict.PASSED:
                error_count = sum([info.error_count for info in report.queries])
                self.summary_sheet.write(
                    self._summary_line,
                    run_index + self._CASE_RESULT_START_COLUMN,
                    "OK" if error_count == 0 else "#" + str(error_count),
                    run_cell_style,
                )

            case Verdict.FAILED:
                verdict_code = self.get_verdict_code(report.exception_name)
                self.summary_sheet.write(
                    self._summary_line,
                    run_index + self._CASE_RESULT_START_COLUMN,
                    verdict_code,
                    run_cell_style,
                )

            case "skipped":
                self.summary_sheet.write(
                    self._summary_line,
                    run_index + self._CASE_RESULT_START_COLUMN,
                    "SK",
                    run_cell_style,
                )

            case Verdict.PASSED:
                self.summary_sheet.write(
                    self._summary_line,
                    run_index + self._CASE_RESULT_START_COLUMN,
                    "PT",
                    run_cell_style,
                )

    @staticmethod
    def get_verdict_code(exception_name: str | None) -> str:
        match exception_name:
            case CompileError.__name__:
                return "CE"
            case MatchError.__name__:
                return "ME"
            case MatchingError.__name__:
                return "ME"
            case ScoreError.__name__:
                return "SE"
            case AssertionError.__name__:
                return "RE"

        return "RE"

    def _write_commit_shas(self, sha_list: list[str]) -> None:
        self.sha_sheet.write(0, 0, str(sha_list), self.default_style)

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
        status: Verdict | str,
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
                    TypeAdapter(list[Attachment])
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

        if query_info.llm_score.score is not None:
            self.details_sheet.write(
                self._details_line, 2, "LLM Score:", query_cell_style
            )
            if query_info.llm_score.score >= 0:
                score_text = f"Score: {query_info.llm_score.score}. Explanation: {query_info.llm_score.explanation}"
            else:
                score_text = "Score was not generated."

            self.details_sheet.write(
                self._details_line, 3, score_text, query_cell_style
            )

            self._details_line += 1
        if query_info.redundancy_score.score is not None:
            self.details_sheet.write(
                self._details_line, 2, "Redundancy LLM Score:", query_cell_style
            )
            if query_info.redundancy_score.score >= 0:
                score_text = f"Score: {query_info.redundancy_score.score}. Explanation: {query_info.redundancy_score.explanation}"
            else:
                score_text = "Score was not generated."

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
        # run counts
        is_runs_present = False
        is_full_success = True
        is_partial_success = False

        for report in reports:
            # status statistics
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

        # llm-based scores
        reports_llm_avg_score_dict = self._get_avg_llm_score(reports, "llm_score")
        if reports_llm_avg_score_dict:
            self._statistic.llm_avg_scores.append(
                reports_llm_avg_score_dict["scores_mean"]
            )
            self._statistic.llm_score_runs_count += reports_llm_avg_score_dict[
                "successful_scores_count"
            ]
            self._statistic.llm_score_max_runs_count += reports_llm_avg_score_dict[
                "total_scores_count"
            ]

        reports_redundancy_avg_score_dict = self._get_avg_llm_score(
            reports, "redundancy_score"
        )
        if reports_redundancy_avg_score_dict:
            self._statistic.redundancy_avg_scores.append(
                reports_redundancy_avg_score_dict["scores_mean"]
            )
            self._statistic.redundancy_score_runs_count += (
                reports_redundancy_avg_score_dict["successful_scores_count"]
            )
            self._statistic.redundancy_score_max_runs_count += (
                reports_redundancy_avg_score_dict["total_scores_count"]
            )

        # token counts
        reports_gen_tokens = XLSXReport._get_avg_tokens(
            reports, "generation_output_tokens"
        )
        if reports_gen_tokens:
            self._statistic.generation_avg_tokens.append(reports_gen_tokens)

        reports_summary_tokens = XLSXReport._get_avg_tokens(
            reports, "summary_output_tokens"
        )
        if reports_summary_tokens:
            self._statistic.summary_avg_tokens.append(reports_summary_tokens)

    def _prepare_summary_sheet(self, sheet: Worksheet) -> None:
        sheet.write(self._summary_line, 0, "Case", self.header_style)
        sheet.write(self._summary_line, 1, "", self.header_style)
        sheet.write(self._summary_line, 2, "LLMS", self.header_style)
        sheet.write(self._summary_line, 3, "RLLMS", self.header_style)

        sheet.set_column_pixels(2, 3, width=50)
        sheet.set_column_pixels(
            self._CASE_RESULT_START_COLUMN,
            self._CASE_RESULT_START_COLUMN + 20,
            width=20,
        )
        for i in range(0, 19):
            sheet.write(
                self._summary_line,
                self._CASE_RESULT_START_COLUMN + i,
                f"{i + 1}",
                self.header_style,
            )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 20,
            "GAAT",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 21,
            "SAT",
            self.header_style,
        )
        sheet.write(self._summary_line, self._CASE_RESULT_START_COLUMN + 22, "ITC")
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 23,
            "OTC",
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 24,
            "PREV PROBA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 25,
            "PROBA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 26,
            "PVAL",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 27,
            "BETA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 28,
            "H_LEN",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 29,
            "R_LEN",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 31,
            "PRIOR PREV PROBA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 32,
            "PRIOR PROBA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 33,
            "PRIOR PVAL",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 34,
            "PRIOR BETA",
            self.header_style,
        )
        sheet.write(
            self._summary_line,
            self._CASE_RESULT_START_COLUMN + 35,
            "PRIOR R_LEN",
            self.header_style,
        )
        sheet.set_column_pixels(
            self._CASE_RESULT_START_COLUMN + 20,
            self._CASE_RESULT_START_COLUMN + 35,
            width=50,
        )
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

    llm_avg_scores: list[float] = []
    llm_score_runs_count: int = 0
    llm_score_max_runs_count: int = 0

    redundancy_avg_scores: list[float] = []
    redundancy_score_runs_count: int = 0
    redundancy_score_max_runs_count: int = 0

    generation_avg_tokens: list[float] = []
    summary_avg_tokens: list[float] = []

    total_test_count: int = 0
    success_test_count: int = 0

    global_stats: GlobalStats = GlobalStats(
        fisher_pvalue=0.0,
        history_commits=[],
        n_higher=0.0,
        n_lower=0.0,
        n_same=0.0,
        alpha=0.2,
        beta=0.2,
        delta=0.2,
        fraction_failed=0.33,
    )
