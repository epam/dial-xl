package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Type;
import java.util.Objects;

@RestController
public class ParseSheetController {
    private static final Gson GSON = new GsonBuilder()
            .excludeFieldsWithoutExposeAnnotation()
            .registerTypeAdapter(Formula.class, new FormulaSerializer())
            .create();

    @PostMapping(value = "/v1/parse-sheet", produces = "application/json")
    public ResponseEntity<String> parse(@RequestBody(required = false) String dsl) {
        ParsedSheet parsedSheet = SheetReader.parseSheet("unused", Objects.requireNonNullElse(dsl, ""));
        return ResponseEntity.ok(GSON.toJson(parsedSheet));
    }

    public static class FormulaSerializer implements JsonSerializer<Formula> {
        @Override
        public JsonElement serialize(Formula formula, Type typeOfSrc, JsonSerializationContext context) {
            JsonObject jsonObject = new JsonObject();
            jsonObject.add("span", context.serialize(formula.span()));
            return jsonObject;
        }
    }
}
