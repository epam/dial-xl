from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class UsingPrimitiveAsArray(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()

        check = "compiledsimplecolumn" in message
        check &= "cannot be cast to class" in message
        check &= "compilednestedcolumn" in message

        return check

    def convert(self, message: str) -> str:
        return (
            f"{message}:"
            f" Ensure that you are not passing primitive to function that expects array<primitive>."
        )
