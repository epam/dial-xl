from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class AttemptToIndex(ErrorPredicate):

    def check(self, message: str) -> bool:
        return ("[" in message) or ("]" in message)

    def convert(self, message: str) -> str:
        return message + (
            ": QuantGrid Formulas do not support [] indexing. "
            "Adhere to formula functions documentation and use specialized function."
        )
