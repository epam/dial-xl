package com.epam.quantgrid.input.snowflake;

import com.epam.quantgrid.input.annotate.Input;
import com.epam.quantgrid.input.annotate.Setting;
import com.epam.quantgrid.input.jdbc.JdbcInput;
import com.epam.quantgrid.input.util.DataUtils;
import lombok.Getter;
import lombok.Setter;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Collection;
import java.util.Properties;

@Setter
@Getter
@Input(name = "snowflake", title = "Snowflake")
public class SnowflakeInput extends JdbcInput {

    @Setting(title = "Account", order = 3, required = true, description = "The account to access data")
    private String account;
    @Setting(title = "Username", order = 1, required = true, description = "The username to access data")
    private String user;
    @Setting(title = "Password", order = 2, required = true, writeOnly = true, description = "The password associated with the username")
    private String password;

    @Setting(title = "Database", order = 4, required = false, description = "The database to access data. You will be able to see and access data from all databases if not specified")
    public void setDatabase(String database) {
        this.database = database;
    }

    @Setting(title = "Schema", order = 5, required = false, description = "The schema to access data. You will be able to see and access data from all schemas if not specified")
    public void setSchema(String database) {
        this.schema = database;
    }

    @Override
    protected Connection getConnection() throws Exception {
        Properties props = new Properties();
        props.put("user", user);
        props.put("password", password);

        if (database != null) {
            props.put("db", database);
        }

        if (schema != null) {
            props.put("schema", schema);
        }

        //props.put("role", "ACCOUNTADMIN");
        //props.put("warehouse", "COMPUTE_WH");
        //props.put("schema", "PUBLIC");
        //props.put("db", "MYDB");

        return DriverManager.getConnection("jdbc:snowflake://%s.snowflakecomputing.com/".formatted(account), props);
    }

    @Override
    protected String buildQuery(String dataset, Collection<String> columns) {
        return DataUtils.selectColumns(dataset, columns);
    }
}