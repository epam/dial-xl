from typing import NamedTuple

from numpy import integer
from numpy.typing import NDArray


class MatchCandidates(NamedTuple):
    mask: NDArray[integer]
    exceptions: list[Exception | None]
