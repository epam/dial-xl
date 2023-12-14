package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.value.Table;
import org.jetbrains.annotations.Nullable;

public interface ResultListener {

    void onUpdate(String tableName,
                  String fieldName,
                  long start,
                  long end,
                  boolean content,
                  long version,
                  @Nullable Table value,
                  @Nullable String error,
                  @Nullable ResultType resultType);
}
