package com.epam.deltix.quantgrid.web.model;

import com.epam.deltix.quantgrid.parser.ParsedSheet;
import lombok.Value;

@Value
public class WorksheetState {
    String sheetName;
    String dsl;
    ParsedSheet parsedSheet;
}
