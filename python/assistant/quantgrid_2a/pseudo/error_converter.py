import typing

from quantgrid_2a.pseudo.errors import ConversionError, QuantGridError
from quantgrid_2a.pseudo.predicates import (
    DIAL_PREDICATES,
    PSEUDO_PREDICATES,
    ErrorPredicate,
)


class ErrorConverter:

    @staticmethod
    def _convert_error(predicates: typing.List[ErrorPredicate], message: str) -> str:
        for predicate in predicates:
            if predicate.check(message):
                return predicate.convert(message)

        return message

    @staticmethod
    def convert_pseudo_errors(
        errors: typing.List[ConversionError],
    ) -> typing.List[ConversionError]:
        return [
            ConversionError(
                ErrorConverter._convert_error(PSEUDO_PREDICATES, error.message)
            )
            for error in errors
        ]

    @staticmethod
    def convert_quantgrid_errors(
        errors: typing.List[QuantGridError],
    ) -> typing.List[QuantGridError]:
        new_errors: typing.List[QuantGridError] = []

        for error in errors:
            new_errors.append(
                QuantGridError(
                    sheet_name=error.sheet_name,
                    table_name=error.table_name,
                    field_name=error.field_name,
                    line=error.line,
                    position=error.position,
                    message=ErrorConverter._convert_error(
                        DIAL_PREDICATES, error.message
                    ),
                )
            )

        return new_errors
