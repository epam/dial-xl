from quantgrid_2a.pseudo.predicates.error_predicate import ErrorPredicate


class ForgotCurlyBrackets(ErrorPredicate):

    def check(self, message: str) -> bool:
        message = message.lower()

        check = "offending token" in message
        check &= "=>" in message

        return check

    def convert(self, message: str) -> str:
        return message + ": Possibly missing curly brackets around lambda."
