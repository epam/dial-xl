from quantgrid_2a.pseudo.predicates.dial_predicates.dereferencing_from_nested import (
    DereferencingFromNested,
)
from quantgrid_2a.pseudo.predicates.dial_predicates.dereferencing_list import (
    DereferencingList,
)
from quantgrid_2a.pseudo.predicates.dial_predicates.invalid_parameters import (
    InvalidParameters,
)
from quantgrid_2a.pseudo.predicates.dial_predicates.using_primitive_as_array import (
    UsingPrimitiveAsArray,
)

DIAL_PREDICATES = [
    DereferencingFromNested(),
    DereferencingList(),
    InvalidParameters(),
    UsingPrimitiveAsArray(),
]

__all__ = ["DIAL_PREDICATES"]
