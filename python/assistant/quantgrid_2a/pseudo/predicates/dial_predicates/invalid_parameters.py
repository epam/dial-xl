from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class InvalidParameters(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()

        check = "function" in message
        check &= "expects" in message
        check &= "argument" in message

        return check

    def convert(self, message: str) -> str:
        return (
            f"{message}. Consult with function documentation to ensure correct usage."
        )
