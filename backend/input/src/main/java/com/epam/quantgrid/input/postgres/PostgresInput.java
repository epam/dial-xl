package com.epam.quantgrid.input.postgres;

import com.epam.quantgrid.input.annotate.Input;
import com.epam.quantgrid.input.annotate.Setting;
import com.epam.quantgrid.input.jdbc.JdbcInput;
import lombok.Getter;
import lombok.Setter;

import java.sql.Connection;
import java.sql.DriverManager;

@Setter
@Getter
@Input(name = "postgres", title = "PostgreSQL")
public class PostgresInput extends JdbcInput {
    @Setting(title = "Host", order = 1, required = true, description = "The hostname of the PostgreSQL server")
    private String host;
    @Setting(title = "Port", order = 2, required = true, description = "The port of the PostgreSQL server")
    private String port;
    @Setting(title = "Username", order = 5, required = true, description = "The username to access data")
    private String user;
    @Setting(title = "Password", order = 6, required = true, writeOnly = true, description = "The password associated with the username")
    private String password;

    @Setting(title = "Database", order = 3, required = true, description = "The database to access data. You will be able to see and access data from all databases if not specified")
    public void setDatabase(String database) {
        this.database = database;
    }

    @Setting(title = "Schema", order = 4, required = false, description = "The schema to access data. You will be able to see and access data from all schemas if not specified")
    public void setSchema(String database) {
        this.schema = database;
    }

    @Override
    protected Connection getConnection() throws Exception {
        return DriverManager.getConnection("jdbc:postgresql://%s:%s/%s".formatted(host, port, database), user, password);
    }
}