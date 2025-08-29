package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.parser.Span;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Stack;

@UtilityClass
public class SuggestionHelper {
    public String getSuggestion(CompileContext context, int argumentIndex) {
        Formula arg0 = context.argument(0);
        if (arg0.span() == null) {
            return "";
        }

        CompiledResult result = context.lookupResult(arg0);
        if (!(result instanceof CompiledReferenceTable referenceTable)) {
            return "";
        }

        Formula argN = context.argument(argumentIndex);
        if (argN.span() == null) {
            return "";
        }

        Formula function = context.function();
        if (function.span() == null) {
            return "";
        }

        List<FieldReference> formulas = getFieldReferences(context, argN, referenceTable.name());
        if (formulas.isEmpty()) {
            return "";
        }

        String updatedText = replaceFormulas(function.span(), arg0, formulas, arg0.span().text());
        return " Did you mean %s?".formatted(updatedText);
    }

    private String replaceFormulas(
            Span span, Formula tableArg, List<FieldReference> fieldReferences, CharSequence replacement) {
        List<Formula> sortedFormulas = new ArrayList<>();
        sortedFormulas.add(tableArg);
        sortedFormulas.addAll(fieldReferences);
        sortedFormulas.sort(Comparator.comparing(formula -> formula.span().from()));
        StringBuilder result = new StringBuilder();
        int lastIndex = 0;
        for (Formula formula : sortedFormulas) {
            int start = formula.span().from() - span.from();
            int end = start + formula.span().text().length();

            result.append(span.text(), lastIndex, start);
            result.append(replacement);
            if (formula instanceof FieldReference fieldReference) {
                result.append("[");
                result.append(fieldReference.field());
                result.append("]");
            }
            lastIndex = end;
        }

        result.append(span.text().subSequence(lastIndex, span.text().length()));
        return result.toString();
    }


    private List<FieldReference> getFieldReferences(CompileContext context, Formula root, String table) {
        Stack<Formula> stack = new Stack<>();
        stack.push(root);
        List<FieldReference> references = new ArrayList<>();
        while (!stack.isEmpty()) {
            Formula formula = stack.pop();
            CompiledResult formulaResult = context.lookupResult(formula);
            if (formulaResult == null || !formulaResult.nested()) {
                continue;
            }

            if (formulaResult.dimensions().isEmpty()
                    && formula instanceof FieldReference fieldReference
                    && fieldReference.table() instanceof TableReference tableReference
                    && Objects.equals(table, tableReference.table())) {
                references.add(fieldReference);
            } else {
                for (Formula argument : formula.arguments()) {
                    CompiledResult argumentResult = context.lookupResult(argument);
                    if (argumentResult == null || !argumentResult.nested()) {
                        continue;
                    }
                    if (argumentResult.dimensions().isEmpty()) {
                        // Does not promote if target dimensions are empty
                        argumentResult = context.promote(argumentResult, formulaResult.dimensions());
                    }

                    if (argumentResult.hasSameLayout(formulaResult)) {
                        stack.push(argument);
                    }
                }
            }
        }
        return references;
    }
}
