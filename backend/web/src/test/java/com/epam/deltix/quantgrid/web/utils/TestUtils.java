package com.epam.deltix.quantgrid.web.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.TextNode;
import lombok.experimental.UtilityClass;
import org.junit.jupiter.api.Assertions;

import java.util.Iterator;

@UtilityClass
public class TestUtils {

    private static final JsonMapper MAPPER = new JsonMapper();

    public void assertJson(String expected, String actual, double delta) {
        try {
            JsonNode expectedTree = MAPPER.readTree(expected);
            JsonNode actualTree = MAPPER.readTree(actual);

            if (!isJsonEqual(expectedTree, actualTree, delta)) {
                Assertions.assertEquals(expectedTree.toPrettyString(), actualTree.toPrettyString());
            }
        } catch (JsonProcessingException e) {
            Assertions.fail("Not a json text to compare");
        }
    }

    private boolean isJsonEqual(JsonNode expected, JsonNode actual, double delta) {
        if (expected == actual) {
            return true;
        }

        if (expected == null || actual == null) {
            return false;
        }

        if (expected instanceof TextNode text && text.textValue().equals("@ignore")) {
            return true;
        }

        if (expected.isDouble() && actual.isDouble()) {
            double left = expected.asDouble();
            double right = actual.asDouble();
            return Double.compare(left, right) == 0 || Math.abs(left - right) <= delta;
        }

        if (expected.isObject() && actual.isObject()) {
            if (actual.size() != expected.size()) {
                return false;
            }

            for (Iterator<String> iterator = actual.fieldNames(); iterator.hasNext(); ) {
                String name = iterator.next();
                JsonNode left = expected.get(name);
                JsonNode right = actual.get(name);

                if (!isJsonEqual(left, right, delta)) {
                    return false;
                }
            }

            return true;
        }

        if (expected.isArray() && actual.isArray()) {
            ArrayNode lefts = (ArrayNode) expected;
            ArrayNode rights = (ArrayNode) actual;

            if (lefts.size() != rights.size()) {
                return false;
            }

            for (int i = 0; i < lefts.size(); i++) {
                JsonNode left = lefts.get(i);
                JsonNode right = rights.get(i);

                if (!isJsonEqual(left, right, delta)) {
                    return false;
                }
            }

            return true;
        }

        return expected.equals(actual);
    }
}
