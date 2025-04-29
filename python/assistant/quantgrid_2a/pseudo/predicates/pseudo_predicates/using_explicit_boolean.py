from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class UsingExplicitBoolean(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()

        check = "variable scope error" in message
        check &= ("true" in message) or ("false" in message)

        return check

    def convert(self, message: str) -> str:
        text = (
            ": Quantgrid does not support explicit booleans (true, false). "
            "To check truth, just specify boolean value, i.e. `if(boolean_value, 1, 0)`."
        )

        return message + text
