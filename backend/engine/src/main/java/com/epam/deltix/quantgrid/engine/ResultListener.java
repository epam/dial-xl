package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.CompileKey;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.Map;

public interface ResultListener {

    default void onParsing(List<ParsedSheet> sheets) {
    }

    default void onCompilation(Map<CompileKey, CompiledResult> results, Map<ParsedKey, String> errors) {
    }

    default void onSimilaritySearch(FieldKey key,
                                    Table searchResult,
                                    @Nullable String error) {
    }

    default void onUpdate(ParsedKey key,
                          long start,
                          long end,
                          boolean content,
                          @Nullable Table value,
                          @Nullable String error,
                          @Nullable ResultType resultType) {
    }
}
