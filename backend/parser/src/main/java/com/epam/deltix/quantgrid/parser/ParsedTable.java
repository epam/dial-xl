package com.epam.deltix.quantgrid.parser;

import java.util.List;

import com.google.gson.annotations.Expose;
import lombok.Builder;
import lombok.Value;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.Token;
import org.jetbrains.annotations.Nullable;

@Slf4j
@Builder
@Value
@Accessors(fluent = true)
public class ParsedTable {
    @Expose
    Span span;
    @Expose
    ParsedText name;
    @Expose
    List<ParsedFields> fields;
    @Expose
    @Builder.Default
    List<ParsedDecorator> decorators = List.of();
    @Expose
    @Builder.Default
    List<ParsedText> docs = List.of();
    @Expose
    @Nullable
    ParsedApply apply;
    @Expose
    List<ParsedTotal> totals;
    @Expose
    @Nullable
    ParsedOverride overrides;

    public String tableName() {
        return name.text();
    }

    public ParsedTable(
            Span span,
            ParsedText name,
            List<ParsedFields> fields,
            List<ParsedDecorator> decorators,
            List<ParsedText> docs,
            @Nullable ParsedApply apply,
            List<ParsedTotal> totals,
            @Nullable ParsedOverride parsedOverride) {
        this.span = span;
        this.name = name;
        this.fields = fields;
        this.decorators = decorators;
        this.docs = docs;
        this.apply = apply;
        this.totals = totals;
        this.overrides = parsedOverride;
    }

    public ParsedTable(
            Span span,
            ParsedText name,
            List<ParsedFields> fields,
            List<ParsedDecorator> decorators,
            List<ParsedText> docs) {
        this(span, name, fields, decorators, docs, null, null, null);
    }

    public static ParsedTable from(SheetParser.Table_definitionContext context, ErrorListener listener) {
        // validate table name
        ParsedText tableName = ParsedText.fromTableName(context.table_name());
        if (tableName == null) {
            Token token = context.table_name() != null ? context.table_name().getStart() : context.getStart();
            listener.syntaxError(token, "Missing table name", null, null);
            return null;
        }

        List<ParsedFields> fields = ParsedFields.from(context.fields_definition(), tableName.text(), listener, true);
        List<ParsedDecorator> decorators = ParsedDecorator.from(context.decorator_definition());
        List<ParsedText> docs = ParsedText.fromDocs(context.doc_comment());
        ParsedApply apply = ParsedApply.from(context.apply_definition(), tableName.text(), listener);
        List<ParsedTotal> totals = ParsedTotal.from(context.total_definition(), tableName.text(), listener);
        ParsedOverride override = ParsedOverride.from(context.override_definition(), tableName.text(), listener);

        return new ParsedTable(Span.from(context), tableName, fields, decorators, docs, apply, totals, override);
    }


}
