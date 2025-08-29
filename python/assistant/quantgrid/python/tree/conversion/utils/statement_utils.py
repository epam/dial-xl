from typing import Sequence

import libcst as cst


def suites_to_indented_block(
    *suites: Sequence[cst.BaseStatement | cst.BaseSmallStatement],
) -> cst.IndentedBlock:
    return cst.IndentedBlock(
        [
            (
                cst.SimpleStatementLine([statement])
                if isinstance(statement, cst.BaseSmallStatement)
                else statement
            )
            for suite in suites
            for statement in suite
        ]
    )
