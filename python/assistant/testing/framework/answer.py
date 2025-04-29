import traceback

from typing import Iterable, List, Tuple

import numpy

from dial_xl.calculate import FieldData
from dial_xl.project import Project
from numpy import integer
from numpy.typing import NDArray
from pydantic import BaseModel

from quantgrid.configuration import LOGGER
from quantgrid.models import AddTableAction
from testing.framework.exception_utils import fetch_most_relevant_exceptions_from_list
from testing.framework.exceptions import MatchError, MatchingError
from testing.framework.expected_actions import ExpectedAction
from testing.framework.match_candidates import MatchCandidates
from testing.framework.models import Output
from testing.framework.project_utils import get_sheet, get_table


class Answer:
    def __init__(
        self, project_state: Project, output: list[Output], classification_route: str
    ):
        self._project_state = project_state
        self._output = output
        self._classification_route = classification_route

    def get_project_state(self) -> Project:
        return self._project_state

    def get_classification_route(self) -> str:
        return self._classification_route

    def fetch_most_relevant_exceptions(
        self, matches: dict[ExpectedAction, MatchCandidates]
    ) -> str | None:
        # matches.exceptions is basically ExpectedAction x Actions matrix.
        # Which elements are causes why ExpectedAction could not be matched on Action

        exception_list: list[BaseException | None] = [None] * len(matches)
        for i, expected_action_matches in enumerate(matches.values()):
            if expected_action_matches.mask.sum() > 0:
                continue

            exception_list[i] = fetch_most_relevant_exceptions_from_list(
                expected_action_matches.exceptions
            )

        selectors_report = (
            "================================\n"
            "Most relevant errors:\n"
            "================================\n"
        )

        expected_actions = list(matches.keys())
        for i, e in enumerate(exception_list):
            if e:
                selectors_report += (
                    f"{i} {type(expected_actions[i])} "
                    f"{''.join(traceback.format_exception(type(e), e, e.__traceback__))}\n"
                )  # type: ignore
            else:
                selectors_report += f"{i} {type(expected_actions[i])} was matched\n"

        return selectors_report

    def assertion(self, graph: ExpectedAction, strict=False):
        matches, match_found = self.get_matches(graph, strict)
        if match_found:
            return
        else:
            selectors = list(graph.selections())
            actions = list(matches.keys())

            selectors_report: str | None = None
            if len(selectors) == 1:
                # Simple case we can simply report list of errors.
                selectors_report = self.fetch_most_relevant_exceptions(matches)

            if selectors_report is None:
                selectors_report = self._selectors_report(
                    actions, graph.selections(), matches
                )

            self._unmatch_log(actions, selectors_report)
            raise MatchError(selectors_report)

    def negative_assertion(self, graph: ExpectedAction, strict=False):
        matches, match_found = self.get_matches(graph, strict)
        if not match_found:
            return
        else:
            actions = list(matches.keys())
            selectors_report = self._selectors_report(
                actions, graph.selections(), matches, negative=True
            )
            self._unmatch_log(actions, selectors_report)
            raise MatchError(selectors_report, negative=True)

    def get_matches(
        self, graph: ExpectedAction, strict=False
    ) -> Tuple[dict[ExpectedAction, MatchCandidates], bool]:
        matches: dict[ExpectedAction, MatchCandidates] = {
            action: MatchCandidates(
                numpy.zeros(len(self._output), dtype=int),
                [None for _ in range(len(self._output))],
            )
            for action in graph.actions()
        }

        for expected, candidates in matches.items():
            mask: list[int] = []
            for i, item in enumerate(self._output):
                try:
                    expected.match(self._project_state, item)
                    mask.append(i)
                except MatchingError as error:
                    candidates.exceptions[i] = error

            candidates.mask[mask] = 1

        for selection in graph.selections():
            if strict and len(selection) != len(self._output):
                continue

            current_combination = [matches[item].mask for item in selection]
            if not strict:
                if self._match(current_combination):
                    self._match_log(selection, [0] * len(self._output))
                    return matches, True
            else:
                match = self._match_strict(current_combination)
                if match is not None:
                    self._match_log(selection, match)
                    return matches, True

        return matches, False

    @staticmethod
    def _match(candidates: list[NDArray[integer]]) -> bool:
        return all(x.sum() > 0 for x in candidates)

    def _match_strict(
        self, candidates: list[NDArray[integer]], used: NDArray[integer] | None = None
    ) -> list[int] | None:
        if not candidates:
            return []

        if used is None:
            used = numpy.zeros_like(candidates[0])

        where = numpy.where(candidates[0] - used > 0)
        if len(where) == 0:
            return None

        for index in where[0]:
            if not index.size:
                continue

            index = index.item()

            # used[index] = 1

            match = self._match_strict(candidates[1:], used)
            if match is not None:
                return [index] + match

            used[index] = 0

        return None

    def _match_log(self, selection: list[ExpectedAction], match: list[int]):
        messages: list[str] = ["OK [Match] "]
        for expected, index in zip(selection, match):
            actual = self._output[index]

            formatted_expected = str(expected).replace("\n", "\n\t")
            formatted_actual = self._format_pydantic(actual).replace("\n", "\n\t")

            messages.append(f"Expected:\n{formatted_expected}")
            messages.append(f"Matched:\n{formatted_actual}\n")

            messages.append("\n----------------------------------------------\n")

        LOGGER.info("\n".join(messages))

    @staticmethod
    def _selectors_report(
        expected: List[ExpectedAction],
        selectors: Iterable[List[ExpectedAction]],
        matches: dict[ExpectedAction, MatchCandidates],
        negative: bool = False,
    ) -> str:
        messages: list[str] = []
        if not negative:
            for i, selection in enumerate(selectors):
                messages.append(
                    f"Selector {str(i)}: {' '.join([str(expected.index(s)) for s in selection])} non-matched: "
                    f"{' '.join([str(expected.index(s)) for s in selection if matches[s].mask.sum() == 0])}"
                )
        else:
            for i, selection in enumerate(selectors):
                matched_selection = [
                    str(expected.index(s))
                    for s in selection
                    if matches[s].mask.sum() > 0
                ]
                if (
                    len(matched_selection) == len(selection)
                    and len(matched_selection) > 0
                ):
                    messages.append(
                        f"Selector {str(i)}: matched: {' '.join(matched_selection)}"
                    )

        return "\n".join(messages)

    def _unmatch_log(self, expected: List[ExpectedAction], selectors_report: str):
        messages: list[str] = ["FAILED [Match]", "Expected:"]
        for i, expected_action in enumerate(expected):
            formatted_expected = str(expected_action).replace("\n", "\n\t")
            messages.append(f"{i} {formatted_expected}\n")

        messages.append("Actual:")
        for actual_action in self._output:
            formatted_actual = self._format_pydantic(actual_action).replace("\n", "\n\t")  # type: ignore
            messages.append(f"{formatted_actual}\n")

        messages.append(selectors_report)
        messages.append("\n")

        LOGGER.error("\n".join(messages))

    def _format_pydantic(self, model: BaseModel) -> str:
        output: list[str] = [type(model).__name__]
        dump = model.model_dump(mode="python")
        for field in model.model_fields:
            value = ("\n" + str(dump[field])).replace("\n", "\n\t")
            output.append(f"    {field}: {value}")

        if isinstance(model, AddTableAction):
            value = (
                "\n" + self._stringify_table(model.sheet_name, model.table_name)
            ).replace("\n", "\n\t")
            output.append(f"    Content: {value}")

        return "\n" + "\n".join(output) + "\n"

    def _stringify_table(self, sheet_name: str, table_name: str) -> str:
        sheet = get_sheet(self._project_state, sheet_name)
        if sheet is None:
            return "-//-"

        table = get_table(sheet, table_name)
        if table is None:
            return "-//-"

        lines = [
            "".join(["{:^30}".format(field_name) for field_name in table.field_names])
        ]

        length = 0
        for field_name in table.field_names:
            data = table.get_field(field_name).field_data

            if isinstance(data, FieldData):
                length = max(length, len(data.values))

        for i in range(length):
            line = ""
            for field_name in table.field_names:
                data = table.get_field(field_name).field_data

                if isinstance(data, FieldData):
                    line += "{:^30}".format(data.values[i])

            lines.append(line)

        return "\n".join(lines)
