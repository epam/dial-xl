package com.epam.deltix.quantgrid.engine.node.expression.utils;

import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.experimental.UtilityClass;

@UtilityClass
public class StringFunctions {

    public double lt(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return (a.compareTo(b) < 0 ? 1d : 0d);
    }

    public double lte(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return (a.compareTo(b) <= 0 ? 1d : 0d);
    }

    public double eq(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return a.equals(b) ? 1d : 0d;
    }

    public double neq(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return a.equals(b) ? 0d : 1d;
    }

    public double gt(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return a.compareTo(b) > 0 ? 1d : 0d;
    }

    public double gte(String a, String b) {
        if (Strings.isError(a)) {
            return Strings.toDoubleError(a);
        }

        if (Strings.isError(b)) {
            return Strings.toDoubleError(b);
        }

        return a.compareTo(b) >= 0 ? 1d : 0d;
    }

    public double len(String value) {
        return Strings.isError(value) ? Strings.toDoubleError(value) : value.length();
    }

    public double contains(String value, String substring) {
        if (Strings.isError(value)) {
            return Strings.toDoubleError(value);
        }

        if (Strings.isError(substring)) {
            return Strings.toDoubleError(substring);
        }

        return value.contains(substring) ? 1.0 : 0.0;
    }

    public String left(String value, double length) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Doubles.isError(length)) {
            return Doubles.toStringError(length);
        }

        if (Doubles.isEmpty(length)) {
            length = 0;
        }

        if (length < 0) {
            return Strings.ERROR_NA;
        }

        int numberOfChars = Math.min(value.length(), (int) length);
        return value.substring(0, numberOfChars);
    }

    public String right(String value, double length) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Doubles.isError(length)) {
            return Doubles.toStringError(length);
        }

        if (Doubles.isEmpty(length)) {
            length = 0;
        }

        if (length < 0) {
            return Strings.ERROR_NA;
        }

        int valueLength = value.length();
        int numberOfChars = Math.min(valueLength, (int) length);
        return value.substring(valueLength - numberOfChars);
    }

    public String mid(String value, double start, double length) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Doubles.isError(start)) {
            return Doubles.toStringError(start);
        }

        if (Doubles.isError(length)) {
            return Doubles.toStringError(length);
        }

        if (Doubles.isEmpty(start)) {
            start = 0;
        }

        if (Doubles.isEmpty(length)) {
            length = 0;
        }

        if (Doubles.isEmpty(start) || Doubles.isEmpty(length) || start <= 0 || length < 0) {
            return Strings.ERROR_NA;
        }

        int valueLength = value.length();
        int startPosition = (int) start - 1;
        int numberOfChars = (int) length;

        if (startPosition > valueLength) {
            return Strings.EMPTY;
        }

        return value.substring(startPosition, Math.min(startPosition + numberOfChars, valueLength));
    }

    public String substitute(String value, String oldText, String newText) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Strings.isError(oldText)) {
            return oldText;
        }

        if (Strings.isError(newText)) {
            return newText;
        }

        if (Strings.isEmpty(oldText)) {
            return value;
        }

        return value.replace(oldText, newText);
    }

    public String fromCharCode(double code) {
        if (Doubles.isError(code)) {
            return Doubles.toStringError(code);
        }

        if (Doubles.isEmpty(code) || code < 1 || code > 0xFFFF) {
            return Strings.ERROR_NA;
        }

        return String.valueOf((char) code);
    }

    public String stripStart(String value, String textToStrip) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Strings.isError(textToStrip)) {
            return textToStrip;
        }

        int offset = stripStartOffset(value, textToStrip);
        return offset > 0 ? value.substring(offset) : value;
    }

    public String stripEnd(String value, String textToStrip) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Strings.isError(textToStrip)) {
            return textToStrip;
        }

        int offset = stripEndOffset(value, textToStrip);
        return offset > 0 ? value.substring(0, offset) : value;
    }

    public String strip(String value, String textToStrip) {
        if (Strings.isError(value)) {
            return value;
        }

        if (Strings.isError(textToStrip)) {
            return textToStrip;
        }

        int startOffset = stripStartOffset(value, textToStrip);
        int endOffset = stripEndOffset(value, textToStrip);

        if (startOffset > 0 || endOffset < value.length()) {
            return endOffset > startOffset
                    ? value.substring(startOffset, endOffset)
                    : Strings.EMPTY;
        }

        return value;
    }

    private int stripStartOffset(String value, String textToStrip) {
        int offset = 0;

        if (textToStrip.isEmpty()) {
            return offset;
        }

        while (value.startsWith(textToStrip, offset)) {
            offset += textToStrip.length();
        }

        return offset;
    }

    private int stripEndOffset(String value, String textToStrip) {
        int offset = value.length();

        if (textToStrip.isEmpty()) {
            return offset;
        }

        while (value.startsWith(textToStrip, offset - textToStrip.length())) {
            offset -= textToStrip.length();
        }
        return offset;
    }
}
