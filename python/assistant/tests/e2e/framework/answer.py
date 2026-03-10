import logging
import traceback

from collections.abc import Iterable

import numpy

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.table import Table
from numpy import integer
from numpy.typing import NBitBase, NDArray
from public import private, public
from pydantic import BaseModel

from dial.xl.assistant.dto.focus import FocusDTO
from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import find_table
from tests.e2e.exceptions.match_error import MatchError
from tests.e2e.framework.exception_utils import fetch_most_relevant_exception
from tests.e2e.framework.expected_actions import ExpectedAction
from tests.e2e.framework.match_candidates import MatchCandidates
from tests.e2e.framework.testing_utils import is_field_focused, is_table_focused
from tests.e2e.models.actions import AddTableAction
from tests.e2e.models.output import Output

LOGGER = logging.getLogger(__name__)


@public
class Answer:
    def __init__(
        self,
        project_state: Project,
        focus: FocusDTO,
        output: list[Output],
        classification_route: str,
    ) -> None:
        self._project_state = project_state
        self._focus = focus
        self._output = output
        self._classification_route = classification_route

    def get_project_state(self) -> Project:
        return self._project_state

    def get_classification_route(self) -> str:
        return self._classification_route

    def assertion(self, graph: ExpectedAction, *, strict: bool = False) -> None:
        matches, match_found = self._get_matches(graph, strict=strict)
        if match_found:
            return

        selectors = list(graph.selections())
        actions = list(matches.keys())

        selectors_report: str | None = None
        if len(selectors) == 1:
            # Simple case we can simply report list of errors.
            selectors_report = fetch_most_relevant_exceptions(matches)

        if selectors_report is None:
            selectors_report = self._selectors_report(
                actions, graph.selections(), matches
            )

        self._unmatch_log(actions, selectors_report)
        raise MatchError(selectors_report)

    def negative_assertion(
        self, graph: ExpectedAction, *, strict: bool = False
    ) -> None:
        matches, match_found = self._get_matches(graph, strict=strict)
        if not match_found:
            return

        actions = list(matches.keys())
        selectors_report = self._selectors_report(
            actions, graph.selections(), matches, negative=True
        )

        self._unmatch_log(actions, selectors_report)
        raise MatchError(selectors_report, negative=True)

    def _get_matches(
        self, graph: ExpectedAction, *, strict: bool = False
    ) -> tuple[dict[ExpectedAction, MatchCandidates], bool]:
        matches: dict[ExpectedAction, MatchCandidates] = {
            action: MatchCandidates(
                mask=numpy.zeros(len(self._output), dtype=int),
                exceptions=[None for _ in range(len(self._output))],
            )
            for action in graph.actions()
        }

        for expected, candidates in matches.items():
            mask: list[int] = []
            for i, item in enumerate(self._output):
                try:
                    expected.match(self._project_state, self._focus, item)
                    mask.append(i)
                except Exception as error:  # noqa: BLE001
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

    def is_table_focused(self, table: Table) -> bool:
        return is_table_focused(self._focus, table)

    def is_field_focused(self, table: Table, field: Field) -> bool:
        return is_field_focused(self._focus, table, field)

    @staticmethod
    def _match(candidates: list[NDArray[integer[NBitBase]]]) -> bool:
        return all(x.sum() > 0 for x in candidates)

    def _match_strict(
        self,
        candidates: list[NDArray[integer[NBitBase]]],
        used: NDArray[integer[NBitBase]] | None = None,
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
                return [index, *match]

            used[index] = 0

        return None

    def _match_log(self, selection: list[ExpectedAction], match: list[int]) -> None:
        messages: list[str] = ["OK [Match] "]
        for expected, index in zip(selection, match, strict=False):
            actual = self._output[index]

            formatted_expected = str(expected).replace("\n", "\n\t")
            formatted_actual = self._format_pydantic(actual).replace("\n", "\n\t")

            messages.append(f"Expected:\n{formatted_expected}")
            messages.append(f"Matched:\n{formatted_actual}\n")

            messages.append("\n----------------------------------------------\n")

        LOGGER.info("\n".join(messages))

    @staticmethod
    def _selectors_report(
        expected: list[ExpectedAction],
        selectors: Iterable[list[ExpectedAction]],
        matches: dict[ExpectedAction, MatchCandidates],
        *,
        negative: bool = False,
    ) -> str:
        messages: list[str] = []
        if not negative:
            for i, selection in enumerate(selectors):
                selector_value = " ".join([str(expected.index(s)) for s in selection])
                selector_matches = " ".join(
                    [
                        str(expected.index(s))
                        for s in selection
                        if matches[s].mask.sum() == 0
                    ]
                )

                messages.append(
                    f"Selector {i!s}: {selector_value} non-matched: {selector_matches}"
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
                        f"Selector {i!s}: matched: {' '.join(matched_selection)}"
                    )

        return "\n".join(messages)

    def _unmatch_log(
        self, expected: list[ExpectedAction], selectors_report: str
    ) -> None:
        messages: list[str] = ["FAILED [Match]", "Expected:"]
        for i, expected_action in enumerate(expected):
            formatted_expected = str(expected_action).replace("\n", "\n\t")
            messages.append(f"{i} {formatted_expected}\n")

        messages.append("Actual:")
        for actual_action in self._output:
            formatted_actual = self._format_pydantic(actual_action).replace(
                "\n", "\n\t"
            )

            messages.append(f"{formatted_actual}\n")

        messages.append(selectors_report)
        messages.append("\n")

        LOGGER.error("\n".join(messages))

    def _format_pydantic(self, model: BaseModel) -> str:
        output: list[str] = [type(model).__name__]
        dump = model.model_dump(mode="python")

        for field in type(model).model_fields:
            value = ("\n" + str(dump[field])).replace("\n", "\n\t")
            output.append(f"    {field}: {value}")

        if isinstance(model, AddTableAction):
            value = ("\n" + self._stringify_table(model.table_name)).replace(
                "\n", "\n\t"
            )
            output.append(f"    Content: {value}")

        return "\n" + "\n".join(output) + "\n"

    def _stringify_table(self, table_name: str) -> str:
        if (table := find_table(self._project_state, table_name)) is None:
            return "-//-"

        lines = [
            "".join([f"{field.name:^30}" for field in iterate_static_fields(table)])
        ]

        length = 0

        for field in iterate_static_fields(table):
            if isinstance(field.field_data, FieldData):
                length = max(length, len(field.field_data.values))

        for i in range(length):
            line = ""
            for field in iterate_static_fields(table):
                if isinstance(field.field_data, FieldData):
                    line += f"{field.field_data.values[i]:^30}"

            lines.append(line)

        return "\n".join(lines)


@private
def fetch_most_relevant_exceptions(
    matches: dict[ExpectedAction, MatchCandidates],
) -> str | None:
    # matches.exceptions is basically ExpectedAction x Actions matrix.
    # Which elements are causes why ExpectedAction could not be matched on Action

    exception_list: list[BaseException | None] = [None] * len(matches)
    for i, expected_action_matches in enumerate(matches.values()):
        if expected_action_matches.mask.sum() > 0:
            continue

        exception_list[i] = fetch_most_relevant_exception(
            expected_action_matches.exceptions
        )

    selectors_report = (
        "================================\n"
        "Most relevant errors:\n"
        "================================\n"
    )

    expected_actions = list(matches.keys())
    for i, exc in enumerate(exception_list):
        if exc:
            stack_trace = "".join(
                traceback.format_exception(type(exc), exc, exc.__traceback__)
            )

            selectors_report += f"{i} {type(expected_actions[i])} {stack_trace}\n"
        else:
            selectors_report += f"{i} {type(expected_actions[i])} was matched\n"

    return selectors_report
