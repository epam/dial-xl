package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import lombok.RequiredArgsConstructor;
import org.xml.sax.Attributes;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;


@RequiredArgsConstructor
public final class ExcelDataHandler extends DefaultHandler {
    private final ExcelDataConsumer consumer;
    private final StringBuilder valueBuilder = new StringBuilder();
    private int currentRow = -1;
    private int currentColumn = -1;
    private String currentType;
    private String currentStyle;
    private boolean shouldConsumeRow;
    private boolean shouldConsumeCell;
    private boolean captureValue;

    @Override
    public void startElement(String uri, String localName, String qName, Attributes attributes)
            throws SAXParseException {
        switch (qName) {
            case "row" -> {
                currentRow = ExcelUtils.readRowIndex(attributes, currentRow);
                if (consumer.shouldFinish(currentRow)) {
                    throw new SAXStopException();
                }
                shouldConsumeRow = consumer.shouldConsumeRow(currentRow);
                currentColumn = -1;
            }
            case "c" -> {
                if (shouldConsumeRow) {
                    currentColumn = ExcelUtils.readColIndex(attributes, currentColumn);
                    if (consumer.shouldConsumeColumn(currentColumn)) {
                        shouldConsumeCell = true;
                        currentType = attributes.getValue("t");
                        currentStyle = attributes.getValue("s");
                    }
                }
            }
            case "v", "t" -> captureValue = shouldConsumeCell;
        }
    }

    @Override
    public void characters(char[] ch, int start, int length) {
        if (captureValue) {
            valueBuilder.append(ch, start, length);
        }
    }

    @Override
    public void endElement(String uri, String localName, String qName) {
        switch (qName) {
            case "r" -> shouldConsumeRow = false;
            case "c" -> {
                if (shouldConsumeCell) {
                    if (!valueBuilder.isEmpty()) {
                        consumer.consume(valueBuilder, currentRow, currentColumn, currentType, currentStyle);
                        valueBuilder.setLength(0);
                    }

                    shouldConsumeCell = false;
                    currentType = null;
                    currentStyle = null;
                }
            }
            case "v", "t" -> captureValue = false;
        }
    }
}