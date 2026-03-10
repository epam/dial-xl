package com.epam.quantgrid.input.api;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DataCatalog {
    private List<Dataset> datasets = new ArrayList<>();
    private String next;

    @Data
    public static class Dataset {
        private String path;
        private Type type;

        public enum Type {
            TABLE, FILE
        }
    }
}