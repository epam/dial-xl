package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public interface ResultListener {

    default void onParsing(List<ParsedSheet> sheets) {
    }

    default void onCompilation(Compilation compilation) {
    }

    default void onSimilaritySearch(FieldKey key,
                                    Table searchResult,
                                    @Nullable String error) {
    }

    default void onUpdate(ParsedKey key,
                          long start,
                          long end,
                          boolean content,
                          boolean raw,
                          @Nullable Table value,
                          @Nullable String error,
                          @Nullable ResultType resultType) {
    }

    default void onProfile(Trace trace, long startedAt, long stoppedAt, boolean completed) {
    }

    default void onIndex(FieldKey key, @Nullable Table value, @Nullable String error) {
    }
}
