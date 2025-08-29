import typing

from antlr4.error.ErrorListener import ErrorListener


class ParserErrors(ErrorListener):

    def __init__(self):
        super().__init__()

        self._syntax_errors: typing.List[str] = []

    @property
    def syntax_errors(self) -> typing.List[str]:
        return self._syntax_errors

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        if offendingSymbol is None:
            self._syntax_errors.append(
                f"{column}: Parser unexpected syntax error. {msg}."
            )
        else:
            self._syntax_errors.append(
                f"{column}: Parser offending token {offendingSymbol.text}."
            )
