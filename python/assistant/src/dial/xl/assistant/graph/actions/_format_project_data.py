from attrs import frozen
from public import public

from dial.xl.assistant.graph.actions._aggregate_project_data import (
    AggregatedDataPerSheet,
    AggregatedTableData,
)
from dial.xl.assistant.utils.string.markdown import markdown_table


@public
@frozen
class FormattedTableData(AggregatedTableData):
    # Print field even if there are no field values (compile failed, etc.)
    def markdown_values(self) -> str:
        return markdown_table(
            {
                name: field.values.values
                if field.values is not None and field.values.values is not None
                else []
                for name, field in self.fields.items()
            }
        )

    def has_embeddings(self) -> bool:
        return any(field.embeddings is not None for field in self.fields.values())

    # Contrary to values, do not print field if no embeddings were returned by backend
    def markdown_embeddings(self) -> str:
        return markdown_table(
            {
                name: [embedding.data for embedding in field.embeddings]
                for name, field in self.fields.items()
                if field.embeddings is not None
            }
        )

    def row_count(self) -> int:
        return self.count or 0


type FormattedDataPerTable = dict[str, FormattedTableData]
type FormattedDataPerSheet = dict[str, FormattedDataPerTable]


@public
def format_project_data(
    aggregated_data: AggregatedDataPerSheet,
) -> FormattedDataPerSheet:
    """Prepares AggregatedDataPerSheet for jinja rendering.

    Parameters
    ----------
    aggregated_data : AggregatedDataPerSheet
        Aggregated project data.

    Returns
    -------
    dict[str, dict[str, FormattedTableData]]
        Formatted project data for jinja rendering.

    """

    per_sheet: FormattedDataPerSheet = {}
    for sheet_name, aggregated_sheet_data in aggregated_data.items():
        per_table = per_sheet.setdefault(sheet_name, {})

        for table_name, aggregated_table_data in aggregated_sheet_data.items():
            per_table[table_name] = FormattedTableData(
                code=aggregated_table_data.code,
                count=aggregated_table_data.count,
                fields=aggregated_table_data.fields,
            )

    return per_sheet
