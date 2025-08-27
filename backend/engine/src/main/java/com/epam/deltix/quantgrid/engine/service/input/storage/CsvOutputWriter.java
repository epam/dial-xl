package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.univocity.parsers.csv.CsvWriter;
import com.univocity.parsers.csv.CsvWriterSettings;
import lombok.experimental.UtilityClass;

import java.io.OutputStream;
import java.util.List;

@UtilityClass
public class CsvOutputWriter {
    public void write(List<String> names, List<StringColumn> columns, OutputStream stream) {
        CsvWriterSettings settings = new CsvWriterSettings();
        settings.setNullValue("N/A");
        settings.setQuoteEscapingEnabled(true);

        CsvWriter writer = new CsvWriter(stream, settings);
        writer.writeHeaders(names);

        String[] values = new String[columns.size()];
        long rows = columns.get(0).size();

        for (long i = 0; i < rows; i++) {
            for (int j = 0; j < values.length; j++) {
                values[j] = columns.get(j).get(i);
            }

            writer.writeRow(values);
        }

        writer.flush();
    }
}