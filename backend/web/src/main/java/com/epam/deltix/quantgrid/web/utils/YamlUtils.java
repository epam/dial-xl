package com.epam.deltix.quantgrid.web.utils;

import lombok.experimental.UtilityClass;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.nodes.Node;
import org.yaml.snakeyaml.nodes.ScalarNode;

import java.util.Map;

@UtilityClass
public class YamlUtils {
    private final String PARAMETER_PREFIX = "!param";

    public String format(String input, Map<String, Object> parameters) {
        Constructor constructor = new Constructor(new LoaderOptions()) {
            @Override
            protected Object constructObject(Node node) {
                String tag = node.getTag().getValue();
                if (PARAMETER_PREFIX.equals(tag)) {
                    String name = ((ScalarNode) node).getValue();
                    Object value = parameters.get(name);
                    if (value == null) {
                        throw new IllegalArgumentException("Cannot resolve parameter %s.".formatted(name));
                    }

                    return value;
                }

                return super.constructObject(node);
            }
        };

        Yaml parser = new Yaml(constructor);
        Map<String, Object> yaml = parser.load(input);
        return parser.dump(yaml);
    }
}

