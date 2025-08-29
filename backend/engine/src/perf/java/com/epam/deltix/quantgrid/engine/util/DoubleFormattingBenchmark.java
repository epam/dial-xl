package com.epam.deltix.quantgrid.engine.util;

import com.epam.deltix.quantgrid.engine.compiler.result.format.CurrencyFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.DateFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.FormatUtils;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.NumberFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.PercentageFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ScientificFormat;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Formatter;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Fork;
import org.openjdk.jmh.annotations.Measurement;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.annotations.Warmup;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

import java.util.concurrent.TimeUnit;

@Warmup(iterations = 3, time = 3)
@Measurement(iterations = 5, time = 3)
@Fork(1)
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class DoubleFormattingBenchmark {
    private static final int DECIMAL_DIGITS = 2;
    private static final String DECIMAL_DIGITS_STRING = String.valueOf(DECIMAL_DIGITS);
    private static final boolean USE_THOUSANDS_SEPARATOR = true;

    private static final Formatter NUMBER_FORMATTER = new NumberFormat(DECIMAL_DIGITS_STRING, USE_THOUSANDS_SEPARATOR).createFormatter();
    private static final Formatter SCIENTIFIC_FORMATTER = new ScientificFormat(DECIMAL_DIGITS).createFormatter();
    private static final Formatter CURRENCY_FORMATTER = new CurrencyFormat(DECIMAL_DIGITS_STRING, USE_THOUSANDS_SEPARATOR, "$").createFormatter();
    private static final Formatter PERCENTAGE_FORMATTER = new PercentageFormat(DECIMAL_DIGITS_STRING, USE_THOUSANDS_SEPARATOR).createFormatter();
    private static final Formatter DATE_FORMATTER = DateFormat.DEFAULT_DATE_FORMAT.createFormatter();
    private static final Formatter GENERAL_FORMATTER = GeneralFormat.INSTANCE.createFormatter();
    private static final Formatter STRING_NUMBER_FORMATTER = stringFormatNumberFormatter(DECIMAL_DIGITS, USE_THOUSANDS_SEPARATOR);
    private static final Formatter STRING_SCIENTIFIC_FORMATTER = stringFormatScientificFormatter(DECIMAL_DIGITS);

    @Param({"0", "1e30", "1234.56", "1234.567", "-12345678912.34567", "123456789123456789", "0.00000001"})
    public double number;

    @Benchmark
    public String benchmarkBaseline() {
        return Double.toString(number);
    }

    @Benchmark
    public String benchmarkLosslessFormatter() {
        return Doubles.toString(number);
    }

    @Benchmark
    public String benchmarkNumberFormatterStringFormat() {
        return Doubles.toString(number, STRING_NUMBER_FORMATTER);
    }

    @Benchmark
    public String benchmarkNumberFormatter() {
        return Doubles.toString(number, NUMBER_FORMATTER);
    }

    @Benchmark
    public String benchmarkScientificFormatter() {
        return Doubles.toString(number, SCIENTIFIC_FORMATTER);
    }

    @Benchmark
    public String benchmarkScientificFormatterStringFormat() {
        return Doubles.toString(number, STRING_SCIENTIFIC_FORMATTER);
    }

    @Benchmark
    public String benchmarkCurrencyFormatter() {
        return Doubles.toString(number, CURRENCY_FORMATTER);
    }

    @Benchmark
    public String benchmarkPercentageFormatter() {
        return Doubles.toString(number, PERCENTAGE_FORMATTER);
    }

    @Benchmark
    public String benchmarkDateFormatter() {
        return Doubles.toString(number, DATE_FORMATTER);
    }

    @Benchmark
    public String benchmarkGeneralFormatter() {
        return Doubles.toString(number, GENERAL_FORMATTER);
    }

    public static void main(final String[] args) throws RunnerException {
        Options opt = new OptionsBuilder()
                .include(DoubleFormattingBenchmark.class.getName())
                .build();

        new Runner(opt).run();
    }

    private static Formatter stringFormatNumberFormatter(int decimalDigits, boolean useThousandsSeparator) {
        String format = "%" + (useThousandsSeparator ? "," : "") + "." + decimalDigits + "f";
        return value -> String.format(FormatUtils.DEFAULT_LOCALE, format, value);
    }

    private static Formatter stringFormatScientificFormatter(int decimalDigits) {
        String format = "%." + decimalDigits + "E";
        return value -> String.format(FormatUtils.DEFAULT_LOCALE, format, value);
    }
}
