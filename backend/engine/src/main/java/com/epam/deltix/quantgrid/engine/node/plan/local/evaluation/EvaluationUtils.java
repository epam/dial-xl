package com.epam.deltix.quantgrid.engine.node.plan.local.evaluation;

import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class EvaluationUtils {
    public List<String> parseGroundTruth(String a) {
        if (a.isEmpty()) {
            return List.of();
        }

        int i = 0;
        List<String> items = new ArrayList<>();
        StringBuilder item = new StringBuilder();

        while (i <= a.length()) {
            if (i == a.length() || a.charAt(i) == ';') {
                items.add(item.toString());
                item.setLength(0);
            } else if (i + 1 == a.length() || !(a.charAt(i) == '\'' && a.charAt(i + 1) == ';')) {
                item.append(a.charAt(i));
            }

            ++i;
        }

        return items;
    }
}
