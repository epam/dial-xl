from enum import StrEnum


class StageGenerationMethod(StrEnum):
    SKIP = "skip"
    REPLICATE = "replicate"
    REGENERATE = "regenerate"
