package com.epam.quantgrid.input.jdbc;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.quantgrid.input.api.DataCatalog;
import com.epam.quantgrid.input.api.DataInput;
import com.epam.quantgrid.input.api.DataStream;
import com.epam.quantgrid.input.util.DataUtils;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.JDBCType;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Collection;

public abstract class JdbcInput implements DataInput {

    protected String database;
    protected String schema;

    @Override
    public DataCatalog getCatalog(String token) throws Exception {
        if (token != null && !token.isBlank()) {
            throw new UnsupportedOperationException("JDBC input does not support pagination tokens");
        }

        try (Connection connection = getConnection()) {
            DatabaseMetaData meta = connection.getMetaData();
            DataCatalog catalog = new DataCatalog();

            try (ResultSet set = meta.getTables(database, schema, null, new String[] {"TABLE"})) {
                while (set.next()) {
                    String tableDatabase = set.getString("TABLE_CAT");
                    String tableSchema = set.getString("TABLE_SCHEM");
                    String tableName = set.getString("TABLE_NAME");
                    // String tableType = set.getString("TABLE_TYPE");

                    DataCatalog.Dataset dataset = new DataCatalog.Dataset();
                    StringBuilder pathBuilder = new StringBuilder();
                    if (tableDatabase != null) {
                        pathBuilder.append(tableDatabase).append("/");
                    }
                    if (tableSchema != null) {
                        pathBuilder.append(tableSchema).append("/");
                    }
                    pathBuilder.append(tableName);
                    dataset.setPath(pathBuilder.toString());
                    dataset.setType(DataCatalog.Dataset.Type.TABLE);
                    catalog.getDatasets().add(dataset);
                }
            }

            return catalog;
        }
    }

    @Override
    public DataSchema getSchema(String dataset) throws Exception {
        String[] parts = dataset.split("/");
        if (parts.length < 1 || parts.length > 3) {
            throw new IllegalArgumentException("Invalid dataset name: " + dataset);
        }

        int index = parts.length;
        String table = parts[--index];
        String schema = index > 0 ? parts[--index] : null;
        String database = index > 0 ? parts[--index] : null;

        try (Connection connection = getConnection()) {
            DatabaseMetaData meta = connection.getMetaData();
            DataSchema result = new DataSchema();

            try (ResultSet set = meta.getColumns(database, schema, table, null)) {
                while (set.next()) {
                    String columnName = set.getString("COLUMN_NAME");
                    String nativeType = set.getString("TYPE_NAME");
                    JDBCType columnType = JDBCType.valueOf(set.getInt("DATA_TYPE"));
                    result.addColumn(new DataSchema.Column(columnName, nativeType, toInputColumnType(columnType)));
                }
            }

            return result;
        }
    }

    @Override
    public DataStream getStream(String dataset, DataSchema schema) throws Exception {
        String query = buildQuery(dataset, schema.getColumns().keySet());
        Connection connection = null;
        Statement statement = null;
        ResultSet set = null;

        try {
            connection = getConnection();
            statement = connection.createStatement();
            set = statement.executeQuery(query);

            AutoCloseable resources = DataUtils.closer(connection, statement, set);
            return new JdbcStream(resources, schema.toColumnTypes(), set);
        } catch (Throwable error) {
            DataUtils.close(connection, statement, set);
            throw error;
        }
    }

    protected abstract Connection getConnection() throws Exception;

    protected abstract String buildQuery(String dataset, Collection<String> columns);

    private InputColumnType toInputColumnType(JDBCType type) {
        return switch (type) {
            case DATE -> InputColumnType.DATE;
            case TIMESTAMP -> InputColumnType.DATE_TIME;
            case BIT, BOOLEAN -> InputColumnType.BOOLEAN;
            case TINYINT, SMALLINT, INTEGER, BIGINT, REAL, FLOAT, DOUBLE, NUMERIC, DECIMAL -> InputColumnType.DOUBLE;
            default -> InputColumnType.STRING;
        };
    }
}