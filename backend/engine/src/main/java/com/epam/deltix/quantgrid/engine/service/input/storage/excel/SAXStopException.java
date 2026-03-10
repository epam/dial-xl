package com.epam.deltix.quantgrid.engine.service.input.storage.excel;

import org.xml.sax.SAXParseException;


public class SAXStopException extends SAXParseException {
    public SAXStopException() {
        super("End of data range reached", null);
    }
}
