package com.epam.deltix.quantgrid.engine.util;

import com.epam.deltix.quantgrid.util.Doubles;
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

@Warmup(iterations = 2, time = 3)
@Measurement(iterations = 5, time = 3)
@Fork(1)
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class DoubleParsingBenchmark {

    @Param({"1234567.890", "1234567.890K", "1,234,567.890"})
    public String text;

    @Benchmark
    public double benchmarkBaseline() {
        return Double.parseDouble(text);
    }

    @Benchmark
    public double benchmarkParsing() {
        return Doubles.parseDouble(text);
    }

    public static void main(final String[] args) throws RunnerException {
        Options opt = new OptionsBuilder()
                .include(DoubleParsingBenchmark.class.getName())
                .build();

        new Runner(opt).run();
    }
}
