package com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;

import java.util.List;

public record CsvTable(List<CsvColumn> columns) {
}
