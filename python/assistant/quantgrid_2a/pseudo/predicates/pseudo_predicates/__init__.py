from quantgrid_2a.pseudo.predicates.pseudo_predicates.attempt_to_index import (
    AttemptToIndex,
)
from quantgrid_2a.pseudo.predicates.pseudo_predicates.forgot_curly_brackets import (
    ForgotCurlyBrackets,
)
from quantgrid_2a.pseudo.predicates.pseudo_predicates.using_explicit_boolean import (
    UsingExplicitBoolean,
)

PSEUDO_PREDICATES = [
    ForgotCurlyBrackets(),
    AttemptToIndex(),
    UsingExplicitBoolean(),
]

__all__ = ["PSEUDO_PREDICATES"]
