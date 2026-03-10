from attrs import define
from numpy import integer
from numpy.typing import NBitBase, NDArray
from public import public


@public
@define
class MatchCandidates:
    mask: NDArray[integer[NBitBase]]
    exceptions: list[Exception | None]
