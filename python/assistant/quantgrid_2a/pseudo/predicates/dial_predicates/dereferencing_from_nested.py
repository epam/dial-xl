from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class DereferencingFromNested(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()
        return "dereferencing a list from a nested table is not allowed" in message

    def convert(self, message: str) -> str:
        return (
            f"{message}:"
            f" Ensure that you are not passing array<array<type>> to function that expects array<primitive>."
        )
