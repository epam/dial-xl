package com.epam.deltix.quantgrid.web.service.project;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class ProjectTest {

    @Test
    void testParsingYaml() {
        String yaml = """
                Sheet1: "my sheet"
                Sheet2: "!layout(2, 2, \\"title\\", \\"headers\\")
                
                  table A
                
                  \\                  dim [value] = RANGE(10)
                
                  \\                      [company] = \\"company\\" & ([value] MOD 3)
                
                  \\                      [indicator] = \\"indicator\\" & ([value] MOD 2)
                
                  \\                      [index] = [value] MOD 3
                
                  \\
                  "
                /projectMetadata: '{"forkedFrom":{"bucket":"4mJjABtNLN8Kwk5Y3P6HiR1J77GCPPLKuPYEcuUxpcRvvwEGXacftaogojf2raKB6N","path":null,"projectName":"test2"}}'
                """;

        Project actual = Project.fromYaml(yaml);

        String sheet1 = "my sheet";
        String sheet2 = """
                !layout(2, 2, "title", "headers")
                table A
                                  dim [value] = RANGE(10)
                                      [company] = "company" & ([value] MOD 3)
                                      [indicator] = "indicator" & ([value] MOD 2)
                                      [index] = [value] MOD 3
                """;

        Assertions.assertEquals(2, actual.sheets().size());
        Assertions.assertEquals(sheet1, actual.sheets().get("Sheet1"));
        Assertions.assertEquals(sheet2, actual.sheets().get("Sheet2"));
    }
}