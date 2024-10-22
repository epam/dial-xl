package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.Getter;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Accessors(fluent = true)
public class ParsedTotal {

    private final Map<FieldKey, List<Formula>> totals;
    @Getter
    private final int size;

    public ParsedTotal(Map<FieldKey, List<Formula>> map) {
        this.totals = map;
        this.size = map.values().iterator().next().size();
    }

    public Set<FieldKey> fields() {
        return totals.keySet();
    }

    @Nullable
    public List<Formula> getTotals(FieldKey field) {
        return totals.get(field);
    }

    @Nullable
    public static ParsedTotal from(
            List<SheetParser.Total_definitionContext> contexts, String tableName, ErrorListener errorListener) {
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }

        Map<FieldKey, List<Formula>> totals = new HashMap<>();

        for (int i = 0, size = contexts.size(); i < size; i++) {
            SheetParser.Total_definitionContext context = contexts.get(i);
            Object2IntOpenHashMap<FieldKey> occurrences = new Object2IntOpenHashMap<>();
            occurrences.defaultReturnValue(0);

            for (SheetParser.Field_definitionContext field : context.field_definition()) {
                ParsedText fieldName = ParsedText.fromFieldName(field.field_name());
                FieldKey key = new FieldKey(tableName, fieldName == null ? "" : fieldName.text());
                int count = occurrences.addTo(key, 1) + 1;

                if (count > 1) {
                    errorListener.syntaxError(field.start, "Duplicate field name", key.tableName(), key.fieldName());
                    continue;
                }

                Formula formula = ParsedFormula.buildFormula(field.expression());
                List<Formula> formulas = totals.computeIfAbsent(key, ignore -> ObjectArrayList.wrap(new Formula[size]));
                formulas.set(i, formula);
            }
        }

        return new ParsedTotal(totals);
    }
}