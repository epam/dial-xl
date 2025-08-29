package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.ParsedText;
import com.epam.deltix.quantgrid.parser.SheetParser;
import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.ArrayList;
import java.util.List;

@Getter
@Accessors(fluent = true)
public class FieldsReference extends Formula {
    private final Formula table;
    private final List<String> fields;

    public FieldsReference(Span span, Formula table, List<String> fields) {
        super(span, table);
        this.table = table;
        this.fields = fields;
    }

    @Override
    public String toString() {
        return "FieldsReference(span=" + span() + ", table=" + table + ", fields=" + fields + ")";
    }

    public static List<String> parseFields(SheetParser.Fields_referenceContext context) {
        if (context == null) {
            throw new IllegalArgumentException("Expected fields reference");
        }

        List<String> fields = new ArrayList<>();
        for (SheetParser.Field_nameContext ctx : context.field_name()) {
            ParsedText name = ParsedText.fromFieldName(ctx);
            if (name == null) {
                throw new IllegalArgumentException("Missing field name");
            }
            fields.add(name.text());
        }

        return fields;
    }
}