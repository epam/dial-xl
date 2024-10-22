package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Builder;
import lombok.Value;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.Token;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.List;

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
    List<ParsedField> fields;
    @Expose
    List<ParsedDecorator> decorators;
    @Expose
    List<ParsedText> docs;
    @Nullable
    ParsedApply apply;
    @Nullable
    ParsedTotal total;
    @Expose
    @Nullable
    ParsedOverride overrides;

    public String tableName() {
        return name.text();
    }

    public ParsedTable(
            Span span,
            ParsedText name,
            List<ParsedField> fields,
            List<ParsedDecorator> decorators,
            List<ParsedText> docs,
            @Nullable ParsedApply apply,
            @Nullable ParsedTotal total,
            @Nullable ParsedOverride parsedOverride) {
        this.span = span;
        this.name = name;
        this.fields = fields;
        this.decorators = decorators;
        this.docs = docs;
        this.apply = apply;
        this.total = total;
        this.overrides = parsedOverride;
    }

    public ParsedTable(
            Span span,
            ParsedText name,
            List<ParsedField> fields,
            List<ParsedDecorator> decorators,
            List<ParsedText> docs) {
        this(span, name, fields, decorators, docs, null, null, null);
    }

    public static ParsedTable from(SheetParser.Table_definitionContext context, ErrorListener errorListener) {
        List<ParsedField> fields = new ArrayList<>();
        // validate table name
        ParsedText tableName = ParsedText.fromTableName(context.table_name());
        if (tableName == null) {
            Token token = context.table_name() != null ? context.table_name().getStart() : context.getStart();
            errorListener.syntaxError(token, "Missing table name", null, null);
            return null;
        }

        for (SheetParser.Field_definitionContext fieldCtx : context.field_definition()) {
            ParsedField field = ParsedField.from(fieldCtx, tableName.text(), errorListener);
            if (field != null) {
                fields.add(field);
            }
        }

        List<ParsedDecorator> decorators = ParsedDecorator.from(context.decorator_definition());
        List<ParsedText> docs = ParsedText.fromDocs(context.doc_comment());
        ParsedApply apply = ParsedApply.from(context.apply_definition(), tableName.text(), errorListener);
        ParsedTotal total = ParsedTotal.from(context.total_definition(), tableName.text(), errorListener);
        ParsedOverride override = ParsedOverride.from(context.override_definition(), tableName.text(), errorListener);

        return new ParsedTable(
                Span.from(context), tableName, fields, decorators, docs, apply, total, override);
    }
}
