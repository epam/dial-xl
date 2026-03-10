import enum

from public import public


@public
class Verdict(enum.StrEnum):
    PASSED = "passed"
    PARTIAL = "partial"
    FAILED = "failed"
