package com.deltix.quantgrid.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static com.epam.deltix.quantgrid.util.Dates.from;
import static com.epam.deltix.quantgrid.util.Dates.fromDate;
import static com.epam.deltix.quantgrid.util.Dates.fromDateTime;
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
        assertEquals(2, fromDate("01/1/1900"));
        assertEquals(60, fromDate("02/28/1900"));
        assertEquals(61, fromDate("3/01/1900"));
        assertEquals(44014, fromDate("07/02/2020"));
        assertEquals(44014, fromDate("07-02-2020"));
        assertEquals(44014, fromDate("07.02.2020"));
        assertEquals(43101, fromDate("2018-01-01"));
        assertEquals(36526, fromDate("2000-01-01"));
        assertEquals(42186, fromDate("2015-07-01"));
        assertEquals(44661, fromDate("2022-04-10"));
        assertEquals(Double.NaN, fromDate("test"));
        assertEquals(Double.NaN, fromDate("1700"));
        assertEquals(Double.NaN, fromDate("07-02.2020"));
        assertEquals(Double.NaN, fromDate("1.00"));
    }

    @Test
    void testDateTimeFromString() {
        assertDoubles(0.0, fromDateTime("12/30/1899 12 am"));
        assertDoubles(0.541666666, fromDateTime("12/30/1899 1 pm"));
        assertDoubles(0.043055555, fromDateTime("12/30/1899 1:2"));
        assertDoubles(0.543055555, fromDateTime("12/30/1899 1:2 pm"));
        assertDoubles(0.043090277, fromDateTime("12/30/1899 1:2:3"));
        assertDoubles(0.543090277, fromDateTime("12/30/1899 1:2:3 pm"));
        assertDoubles(2.6411226851851852, fromDateTime("1/1/1900 03:23:13 PM"));
        assertDoubles(2.6411226851851852, fromDateTime("01/1/1900 03:23:13 PM"));
        assertDoubles(44014.453634259, fromDateTime("7/02/2020 10:53:14 AM"));
        assertDoubles(44014.453634259, fromDateTime("07/02/2020 10:53:14 AM"));
        assertDoubles(43101, fromDateTime("2018-01-01T00:00:00"));
        assertDoubles(36526.5525, fromDateTime("2000-01-01T13:15:36"));
        assertDoubles(42186.999988426, fromDateTime("2015-07-01T23:59:59"));
        assertDoubles(44661.5, fromDateTime("2022-04-10T12:00:00"));
        assertDoubles(44661.5, fromDateTime("2022-04-10 12:00:00."));
        assertDoubles(44661.5, fromDateTime("2022-04-10 12:00:00.00"));

        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 500_000_000)), fromDateTime("2022-04-10 00:00:00.5"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 500_000_000)), fromDateTime("04/10/2022 00:00:00.5"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 500_000_000)), fromDateTime("04/10/2022 12:00:00.5 am"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 123_456_789)), fromDateTime("2022-04-10 00:00:00.123456789"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 123_456_789)), fromDateTime("04/10/2022 00:00:00.123456789"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 123_456_789)), fromDateTime("04/10/2022 12:00:00.123456789 am"));
        assertEquals(from(LocalDateTime.of(2022, 4, 10, 0,0,0, 999_999_999)), fromDateTime("04/10/2022 00:00:00.999999999"));

        assertDoubles(Double.NaN, fromDateTime("123:4"));
        assertDoubles(Double.NaN, fromDateTime("1:234"));
        assertDoubles(Double.NaN, fromDateTime("1:2:3."));
        assertDoubles(Double.NaN, fromDateTime("1 pm"));
        assertDoubles(Double.NaN, fromDateTime("1/1/1900 23"));
        assertDoubles(Double.NaN, fromDateTime("1/1/1900 23 pm"));
    }

    @Test
    void testExcelDateFromLocalDate() {
        assertEquals(2, from(LocalDate.of(1900, 1, 1).atStartOfDay()));
        assertEquals(59, from(LocalDate.of(1900, 2, 27).atStartOfDay()));
        assertEquals(100, from(LocalDate.of(1900, 4, 9).atStartOfDay()));
        assertEquals(44013, from(LocalDate.of(2020, 7, 1).atStartOfDay()));
        assertEquals(Double.NaN, from(null));
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
        assertEquals(1900, getYear(fromDate("01/01/1900")));
        assertEquals(2020, getYear(fromDate("07/02/2020")));
        assertEquals(2018, getYear(fromDate("2018-01-01")));
        assertEquals(2000, getYear(fromDate("2000-01-01")));
        assertEquals(2015, getYear(fromDate("2015-07-01")));
        assertEquals(2022, getYear(fromDate("2022-04-10")));
        assertEquals(Double.NaN, getYear(fromDate("test")));
        assertEquals(Double.NaN, getYear(fromDate("1700")));
    }

    @Test
    void testMonthPart() {
        assertEquals(3, getMonth(fromDate("03/03/1900")));
        assertEquals(2, getMonth(fromDate("02/07/2020")));
        assertEquals(1, getMonth(fromDate("2018-01-01")));
        assertEquals(7, getMonth(fromDate("2000-07-01")));
        assertEquals(11, getMonth(fromDate("2015-11-01")));
        assertEquals(12, getMonth(fromDate("2022-12-10")));
        assertEquals(Double.NaN, getMonth(fromDate("test")));
        assertEquals(Double.NaN, getMonth(fromDate("1700")));
    }

    @Test
    void testDayPart() {
        assertEquals(30, getDay(fromDate("03/30/1900")));
        assertEquals(7, getDay(fromDate("02/07/2020")));
        assertEquals(1, getDay(fromDate("2018-01-01")));
        assertEquals(12, getDay(fromDate("2000-07-12")));
        assertEquals(28, getDay(fromDate("2015-11-28")));
        assertEquals(10, getDay(fromDate("2022-12-10")));
        assertEquals(Double.NaN, getDay(fromDate("test")));
        assertEquals(Double.NaN, getDay(fromDate("1700")));
    }

    @Test
    void testHourPart() {
        assertEquals(15, getHour(fromDateTime("01/01/1900 03:23:13 PM")));
        assertEquals(10, getHour(fromDateTime("07/02/2020 10:53:14 AM")));
        assertEquals(0, getHour(fromDate("2018-01-01")));
        assertEquals(13, getHour(fromDateTime("2000-01-01T13:15:36")));
        assertEquals(23, getHour(fromDateTime("2015-07-01T23:59:59")));
        assertEquals(12, getHour(fromDateTime("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getHour(getDay(fromDate("test"))));
        assertEquals(Double.NaN, getHour(getDay(fromDate("1700"))));
    }

    @Test
    void testMinutePart() {
        assertEquals(23, getMinute(fromDateTime("01/01/1900 03:23:13 PM")));
        assertEquals(53, getMinute(fromDateTime("07/02/2020 10:53:14 AM")));
        assertEquals(0, getMinute(fromDate("2018-01-01")));
        assertEquals(15, getMinute(fromDateTime("2000-01-01T13:15:36")));
        assertEquals(59, getMinute(fromDateTime("2015-07-01T23:59:59")));
        assertEquals(0, getMinute(fromDateTime("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getMinute(getDay(fromDate("test"))));
        assertEquals(Double.NaN, getMinute(getDay(fromDate("1700"))));
    }

    @Test
    void testSecondPart() {
        assertEquals(13, getSecond(fromDateTime("01/01/1900 03:23:13 PM")));
        assertEquals(14, getSecond(fromDateTime("07/02/2020 10:53:14 AM")));
        assertEquals(0, getSecond(fromDate("2018-01-01")));
        assertEquals(36, getSecond(fromDateTime("2000-01-01T13:15:36")));
        assertEquals(59, getSecond(fromDateTime("2015-07-01T23:59:59")));
        assertEquals(0, getSecond(fromDateTime("2022-04-10T12:00:00")));
        assertEquals(Double.NaN, getSecond(getDay(fromDate("test"))));
        assertEquals(Double.NaN, getSecond(getDay(fromDate("1700"))));
    }

    private static void assertDoubles(double expected, double actual) {
        assertEquals(expected, actual, 1e-9f);
    }
}
