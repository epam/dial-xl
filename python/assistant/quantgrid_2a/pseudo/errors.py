import dataclasses
import io
import typing

from dial_xl.project import Project

from quantgrid.utils.project import FieldGroupUtil


@dataclasses.dataclass(order=True)
class ConversionError:
    message: str

    def __hash__(self) -> int:
        return hash(self.message)


@dataclasses.dataclass(order=True)
class QuantGridError:
    sheet_name: str
    table_name: str | None
    field_name: str | None

    line: int
    position: int
    message: str

    def __hash__(self) -> int:
        return hash(
            (
                self.sheet_name,
                self.table_name,
                self.field_name,
                self.line,
                self.position,
                self.message,
            )
        )


def _extract_errors(
    project: Project, table_name: str | None = None, field_name: str | None = None
) -> typing.List[QuantGridError]:
    errors: typing.List[QuantGridError] = []

    for sheet in project.sheets:
        for error in sheet.parsing_errors:
            errors.append(
                QuantGridError(
                    sheet.name, None, None, error.line, error.position, error.message
                )
            )

        for table in sheet.tables:
            if table_name is not None and table.name != table_name:
                continue

            for field in FieldGroupUtil.get_table_fields(table):
                if field_name is not None and field.name != field_name:
                    continue

                if isinstance(field.field_type, str):
                    errors.append(
                        QuantGridError(
                            sheet.name, table.name, field.name, 0, 0, field.field_type
                        )
                    )

    return list(set(errors))


def relevant_errors(
    prev_snapshot: Project,
    next_snapshot: Project,
    table_name: str | None,
    field_name: str | None,
) -> typing.List[QuantGridError]:
    prev_errors: typing.List[QuantGridError] = _extract_errors(
        prev_snapshot, table_name, field_name
    )
    next_errors: typing.List[QuantGridError] = _extract_errors(
        next_snapshot, table_name, field_name
    )

    return [next_error for next_error in next_errors if next_error not in prev_errors]


def populate_pseudo_errors(errors: typing.List[ConversionError]) -> str:
    with io.StringIO() as stream:
        for i, error in enumerate(errors):
            stream.write(f"{i + 1}. {error.message}\n")

        return stream.getvalue()


def populate_quantgrid_errors(errors: typing.List[QuantGridError]) -> str:
    with io.StringIO() as stream:
        for i, error in enumerate(errors):
            stream.write(f"{i + 1}")

            if error.table_name is not None:
                stream.write(f". '{error.table_name}'")

                if error.field_name is not None:
                    stream.write(f": '{error.field_name}'")

            stream.write(f". {error.message}\n")

        return stream.getvalue()
