import enum


class Verdict(enum.StrEnum):
    PASSED = "passed"
    PARTIAL = "partial"
    FAILED = "failed"
