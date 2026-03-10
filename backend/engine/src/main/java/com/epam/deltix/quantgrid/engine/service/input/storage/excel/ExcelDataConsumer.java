package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

public interface ExcelDataConsumer {
    boolean shouldConsumeRow(int row);
    boolean shouldConsumeColumn(int column);
    boolean shouldFinish(int row);
    void consume(CharSequence value, int row, int column, String type, String style);
}
