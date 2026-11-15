package com.civicops.community.model;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;

public final class JsonFieldHelper {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonFieldHelper() {}

    public static <T> List<T> readList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return MAPPER.readValue(json, typeRef);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public static String writeList(Object value) {
        if (value == null) {
            return "[]";
        }
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }
}
