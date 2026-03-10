package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCell;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.security.Principal;
import java.util.List;

public interface InputProvider {
    /**
     * Previews content of the input source for provided range.
     *
     * @param input source to preview
     * @param range to preview
     * @return list of cells with their coordinates and values in the provided range
     */
    List<ExcelCell> preview(String input, Range range, Principal principal);

    /**
     * Reads catalog of the workbook with provided path. Catalog contains names of sheets and tables in the workbook.
     * @param path to the workbook file
     * @param principal of the user to read the workbook
     * @return catalog of the workbook with provided path
     */
    ExcelCatalog readExcelCatalog(String path, Principal principal);

    /**
     * Parse provided input to get its metadata.
     *
     * @return metadata that represent input's content
     */
    InputMetadata readMetadata(String input, Principal principal);

    /**
     * Reads specified columns into a table using provided metadata of the source.
     *
     * @param readColumns columns to read from the input source
     * @param metadata metadata with columns and types information
     * @return a table for provided read columns
     */
    Value readData(List<String> readColumns, InputMetadata metadata, Principal principal);

    void writeData(String path, List<String> names, List<StringColumn> values, Principal principal);

    /**
     * Human-readable name of the provider.
     */
    String name();
}
