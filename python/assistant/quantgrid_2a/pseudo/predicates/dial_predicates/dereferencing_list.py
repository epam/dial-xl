from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class DereferencingList(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()
        return "dereferencing a list is not allowed" in message

    def convert(self, message: str) -> str:
        return (
            f"{message}:"
            f" Ensure that you are not using array<T> as plain T variable."
        )
