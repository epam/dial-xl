package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ParseSheetController {
    private static final Gson GSON = new GsonBuilder()
            .excludeFieldsWithoutExposeAnnotation()
            .create();

    @PostMapping(value = "/v1/parse-sheet", produces = "application/json")
    public ResponseEntity<String> parse(@RequestBody String dsl) {
        ParsedSheet parsedSheet = SheetReader.parseSheet("unused", dsl);
        return ResponseEntity.ok(GSON.toJson(parsedSheet));
    }
}
