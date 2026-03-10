package com.epam.deltix.quantgrid.engine.service.input;

import java.util.List;

public record ExcelCatalog(List<String> sheets, List<String> tables) {
}
