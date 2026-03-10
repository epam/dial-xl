import enum

from pydantic import BaseModel, Field


class Conclusion(enum.Enum):
    STABLE = 0
    POSITIVE_SHIFT = 1
    NEGATIVE_SHIFT = -1


class CaseStats(BaseModel):
    """
    For the combined test we arbitrarily set alpha, beta and delta, and then determine the required value of n2(run count).
    However, each individual test does not share the same characteristics.
    For each individual test we use the same alpha and delta as in the combined test, BUT calculate beta individually.
    """

    name: str = Field(..., description="Test case name")
    history_probability: float = Field(
        ...,
        description="Bernoulli distribution parameter p estimated from historical data",
    )
    probability: float = Field(
        ...,
        description="Bernoulli distribution parameter p estimated from current report",
    )
    pvalue: float = Field(
        ...,
        description="P-value of the hypothesis test for equality between PREV PROBA and PROBA, using ALPHA, BETA and DELTA",
    )
    history_size: float = Field(
        ..., description="Number of runs in the historical data"
    )
    size: float = Field(..., description="Number of runs in the report")
    beta: float = Field(..., description="Probability of type II error")
    conclusion: Conclusion = Field(
        ...,
        description="""A float flag that take values from the set {-1., 0., 1}
    1. if pvalue is greater than alpha, then 0.
    2. if pvalue is less than alpha and history_probability > probability, then -1
    3. if pvalue is less than alpha and history_probability < probability, then -1""",
    )


class GlobalStats(BaseModel):
    fisher_pvalue: float = Field(
        ..., description="Combined pvalue of all test cases using Fisher's method"
    )
    history_commits: list[str] = Field(
        ..., description="SHA commits used to build the history"
    )
    n_higher: float = Field(
        ...,
        description="Number of test cases that showed statistically significant improvement",
    )
    n_lower: float = Field(
        ...,
        description="Number of test cases that showed statistically significant degradation",
    )
    n_same: float = Field(
        ...,
        description="Number of test cases that showed no statistically significant changes",
    )
    alpha: float = Field(..., description="Probability of type I error")
    beta: float = Field(..., description="Probability of type II error")
    delta: float = Field(
        ...,
        description="Minimum detectable change in Bernoulli distribution parameter p",
    )
    fraction_failed: float = Field(
        ...,
        description="Minimum fraction of test cases that noticeable parameter p change needed to detect it",
    )
