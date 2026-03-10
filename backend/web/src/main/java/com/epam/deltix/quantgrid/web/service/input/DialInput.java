package com.epam.deltix.quantgrid.web.service.input;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.quantgrid.input.annotate.Input;
import com.epam.quantgrid.input.api.DataCatalog;
import com.epam.quantgrid.input.api.DataInput;
import com.epam.quantgrid.input.api.DataRow;
import com.epam.quantgrid.input.api.DataStream;
import com.google.common.escape.Escaper;
import com.google.common.net.UrlEscapers;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.security.Principal;
import java.util.List;

@Data
@Input(name = "dial", title = "DIAL")
public class DialInput implements DataInput {

    private Principal principal;
    private DialFileApi dial;
    private DialInputProvider provider;

    @Override
    public DataCatalog getCatalog(String token) throws Exception {
        if (token != null && !token.isEmpty()) {
            throw new UnsupportedOperationException("Pagination is not supported");
        }

        DataCatalog catalog = new DataCatalog();
        String bucket = dial.getBucket(principal);

        for (DialFileApi.Attributes attributes : dial.listAttributes("files/" + bucket + "/", principal)) {
            String path = attributes.fullPath();
            boolean hidden = path.startsWith(".") || path.contains("/.");
            boolean appdata = path.startsWith("appdata/");
            boolean csv = path.endsWith(".csv");

            if (!hidden && !appdata && csv) {
                DataCatalog.Dataset dataset = new DataCatalog.Dataset();
                dataset.setPath(path);
                dataset.setType(DataCatalog.Dataset.Type.FILE);
                catalog.getDatasets().add(dataset);
            }
        }

        return catalog;
    }

    @Override
    public DataSchema getSchema(String dataset) throws Exception {
        DataSchema schema = new DataSchema();
        String bucket = dial.getBucket(principal);
        String path = "files/" + bucket + "/" + encode(dataset);
        InputMetadata metadata = provider.readMetadata(path, principal);

        List<String> columnNames = metadata.names();
        List<InputColumnType> columnTypes = metadata.types();
        for (int i = 0; i < columnNames.size(); i++) {
            String columnName = columnNames.get(i);
            InputColumnType columnType = columnTypes.get(i);
            DataSchema.Column column = new DataSchema.Column(columnName, columnType.name(), columnType);
            schema.addColumn(column);
        }

        return schema;
    }

    @Override
    public DataStream getStream(String dataset, DataSchema schema) throws Exception {
        String bucket = dial.getBucket(principal);
        String path = "files/" + bucket + "/" + encode(dataset);

        List<String> names = List.copyOf(schema.getColumns().keySet());

        InputMetadata metadata = provider.readMetadata(path, principal);
        LocalTable table = provider.readData(names, metadata, principal);

        return new Stream(schema, table);
    }

    private static String encode(String dataset) {
        StringBuilder builder = new StringBuilder();
        Escaper escaper = UrlEscapers.urlPathSegmentEscaper();

        for (int start = 0, end = dataset.length(); start < end; ) {
            int index = dataset.indexOf('/', start);
            String segment = dataset.substring(start, (index >= 0) ? index : end);
            String escaped = escaper.escape(segment);
            builder.append(escaped);

            if (index < 0) {
                break;
            }

            builder.append('/');
            start = index + 1;
        }

        return builder.toString();
    }

    @RequiredArgsConstructor
    private static class Stream implements DataStream {

        private final DataRow row;
        private final DataSchema schema;
        private final Table table;

        private int index;

        public Stream(DataSchema schema, Table table) {
            this.row = new DataRow(schema.toColumnTypes());
            this.schema = schema;
            this.table = table;
        }

        @Override
        public DataRow next() {
            if (index >= table.size()) {
                return null;
            }

            for (int i = 0; i < table.getColumnCount(); i++) {
                Column column = table.getColumn(i);
                if (column instanceof StringColumn strings) {
                    String value = strings.get(index);
                    row.setString(i, value);
                } else if (column instanceof DoubleColumn numbers) {
                    double value = numbers.get(index);
                    row.setDouble(i, value);
                } else {
                    throw new IllegalArgumentException("Not expected type: " + column.getClass());
                }
            }

            index++;
            return row;
        }

        @Override
        public void close() {
        }
    }
}