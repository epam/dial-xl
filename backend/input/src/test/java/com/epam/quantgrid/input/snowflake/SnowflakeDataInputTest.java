package com.epam.quantgrid.input.snowflake;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.quantgrid.input.api.DataCatalog;
import com.epam.quantgrid.input.api.DataDefinition;
import com.epam.quantgrid.input.api.DataInput;
import com.epam.quantgrid.input.api.DataInputs;
import com.epam.quantgrid.input.api.DataRow;
import com.epam.quantgrid.input.api.DataStream;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

class SnowflakeDataInputTest {

    private final DataInput input = DataInputs.createInput("snowflake", """
            {
              "account": "IHASJOU-TJ02500",
              "user": "****",
              "password": "****"
            }
            """);

    @Test
    void testDefinition() {
        DataDefinition definition = DataInputs.getDefinition("snowflake");
        System.out.println(definition.toJson());
    }

    @Test
    @Disabled
    void testCatalog() throws Exception {
        DataCatalog catalog = input.getCatalog(null);
        System.out.println(catalog);
    }

    @Test
    @Disabled
    void testData() throws Exception {
        String dataset = "MYDB/PUBLIC/MYTABLE";
        DataSchema schema = input.getSchema(dataset);

        try (DataStream stream = input.getStream(dataset, schema)) {
            while (true) {
                DataRow row = stream.next();
                if (row == null) {
                    break;
                }

                System.out.println(row);
            }
        }
    }
}
