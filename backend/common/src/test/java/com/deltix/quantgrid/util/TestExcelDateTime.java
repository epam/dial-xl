package com.deltix.quantgrid.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static com.epam.deltix.quantgrid.util.Dates.from;
import static com.epam.deltix.quantgrid.util.Dates.getDay;
import static com.epam.deltix.quantgrid.util.Dates.getHour;
import static com.epam.deltix.quantgrid.util.Dates.getLocalDate;
import static com.epam.deltix.quantgrid.util.Dates.getMinute;
import static com.epam.deltix.quantgrid.util.Dates.getMonth;
import static com.epam.deltix.quantgrid.util.Dates.getSecond;
import static com.epam.deltix.quantgrid.util.Dates.getYear;
import static org.junit.jupiter.api.Assertions.assertEquals;

class TestExcelDateTime {

    @Test
    void testDateFromString() {
        assertEquals(2, from("01/1/1900"));
        assertEquals(60, from("02/28/1900"));
        assertEquals(61, from("3/01/1900"));
        assertEquals(44014, from("07/02/2020"));
        assertEquals(43101, from("2018-01-01"));
        assertEquals(36526, from("2000-01-01"));
        assertEquals(42186, from("2015-07-01"));
        assertEquals(44661, from("2022-04-10"));
        assertEquals(Double.NaN, from("test"));
        assertEquals(Double.NaN, from("1700"));
    }

    @Test
    void testDateTimeFromString() {
        assertDoubles(2.6411226851851852, from("1/1/1900 03:23:13 PM"));
        assertDoubles(2.6411226851851852, from("01/1/1900 03:23:13 PM"));
        assertDoubles(44014.453634259, from("7/02/2020 10:53:14 AM"));
        assertDoubles(44014.453634259, from("07/02/2020 10:53:14 AM"));
        assertDoubles(43101, from("2018-01-01T00:00:00"));
        assertDoubles(36526.5525, from("2000-01-01T13:15:36"));
        assertDoubles(42186.999988426, from("2015-07-01T23:59:59"));
        assertDoubles(44661.5, from("2022-04-10T12:00:00"));
        assertDoubles(44661.5, from("2022-04-10 12:00:00."));
        assertDoubles(44661.5, from("2022-04-10 12:00:00.00"));

        assertDoubles(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 500_000_000)), from("2022-04-10 00:00:00.5"));
        assertDoubles(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 123_456_789)), from("2022-04-10 00:00:00.123456789"));
    }

    @Test
    void testExcelDateFromLocalDate() {
        assertEquals(2, from(LocalDate.of(1900, 1, 1).atStartOfDay()));
        assertEquals(59, from(LocalDate.of(1900, 2, 27).atStartOfDay()));
        assertEquals(100, from(LocalDate.of(1900, 4, 9).atStartOfDay()));
        assertEquals(44013, from(LocalDate.of(2020, 7, 1).atStartOfDay()));
        assertEquals(Double.NaN, from((LocalDateTime) null));
        assertEquals(Double.NaN, from(LocalDate.of(1899, 1, 1).atStartOfDay()));
        assertEquals(Double.NaN, from(LocalDate.of(1899, 12, 29).atStartOfDay()));
        assertEquals(0, from(LocalDate.of(1899, 12, 30).atStartOfDay()));
    }

    @Test
    void testExcelSerialToLocalDate() {
        assertEquals(LocalDate.of(1900, 1, 1), getLocalDate(2));
        assertEquals(LocalDate.of(1900, 2, 27), getLocalDate(59));
        assertEquals(LocalDate.of(1900, 4, 9), getLocalDate(100));
        assertEquals(LocalDate.of(2000, 1, 1), getLocalDate(36526));
        assertEquals(LocalDate.of(2022, 4, 10), getLocalDate(44661));
    }

    @Test
    void testYearPart() {
        assertEquals(1900, getYear(from("01/01/1900")));
        assertEquals(2020, getYear(from("07/02/2020")));
        assertEquals(2018, getYear(from("2018-01-01")));
        assertEquals(2000, getYear(from("2000-01-01")));
        assertEquals(2015, getYear(from("2015-07-01")));
        assertEquals(2022, getYear(from("2022-04-10")));
        assertEquals(Double.NaN, getYear(from("test")));
        assertEquals(Double.NaN, getYear(from("1700")));
    }

    @Test
    void testMonthPart() {
        assertEquals(3, getMonth(from("03/03/1900")));
        assertEquals(2, getMonth(from("02/07/2020")));
        assertEquals(1, getMonth(from("2018-01-01")));
        assertEquals(7, getMonth(from("2000-07-01")));
        assertEquals(11, getMonth(from("2015-11-01")));
        assertEquals(12, getMonth(from("2022-12-10")));
        assertEquals(Double.NaN, getMonth(from("test")));
        assertEquals(Double.NaN, getMonth(from("1700")));
    }

    @Test
    void testDayPart() {
        assertEquals(30, getDay(from("03/30/1900")));
        assertEquals(7, getDay(from("02/07/2020")));
        assertEquals(1, getDay(from("2018-01-01")));
        assertEquals(12, getDay(from("2000-07-12")));
        assertEquals(28, getDay(from("2015-11-28")));
        assertEquals(10, getDay(from("2022-12-10")));
        assertEquals(Double.NaN, getDay(from("test")));
        assertEquals(Double.NaN, getDay(from("1700")));
    }

    @Test
    void testHourPart() {
        assertEquals(15, getHour(from("01/01/1900 03:23:13 PM")));
        assertEquals(10, getHour(from("07/02/2020 10:53:14 AM")));
        assertEquals(0, getHour(from("2018-01-01")));
        assertEquals(13, getHour(from("2000-01-01T13:15:36")));
        assertEquals(23, getHour(from("2015-07-01T23:59:59")));
        assertEquals(12, getHour(from("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getHour(getDay(from("test"))));
        assertEquals(Double.NaN, getHour(getDay(from("1700"))));
    }

    @Test
    void testMinutePart() {
        assertEquals(23, getMinute(from("01/01/1900 03:23:13 PM")));
        assertEquals(53, getMinute(from("07/02/2020 10:53:14 AM")));
        assertEquals(0, getMinute(from("2018-01-01")));
        assertEquals(15, getMinute(from("2000-01-01T13:15:36")));
        assertEquals(59, getMinute(from("2015-07-01T23:59:59")));
        assertEquals(0, getMinute(from("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getMinute(getDay(from("test"))));
        assertEquals(Double.NaN, getMinute(getDay(from("1700"))));
    }

    @Test
    void testSecondPart() {
        assertEquals(13, getSecond(from("01/01/1900 03:23:13 PM")));
        assertEquals(14, getSecond(from("07/02/2020 10:53:14 AM")));
        assertEquals(0, getSecond(from("2018-01-01")));
        assertEquals(36, getSecond(from("2000-01-01T13:15:36")));
        assertEquals(59, getSecond(from("2015-07-01T23:59:59")));
        assertEquals(0, getSecond(from("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getSecond(getDay(from("test"))));
        assertEquals(Double.NaN, getSecond(getDay(from("1700"))));
    }

    private static void assertDoubles(double expected, double actual) {
        assertEquals(expected, actual, 1e-9f);
    }
}
