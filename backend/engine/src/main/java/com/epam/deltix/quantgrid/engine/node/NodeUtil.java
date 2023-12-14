package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.apache.commons.codec.digest.DigestUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@UtilityClass
public class NodeUtil {

    private final Map<Class<? extends Node>, Field[]> REGISTRY = new ConcurrentHashMap<>();
    private final Field[] NODE_ID = new Field[] {field(Node.class, "id")};

    public boolean depends(Node dependent, Node dependency) {
        Set<Node> visited = new HashSet<>();
        ArrayDeque<Node> queue = new ArrayDeque<>();

        visited.add(dependent);
        queue.add(dependent);

        while (!queue.isEmpty()) {
            Node node = queue.poll();
            if (node == dependency) {
                return true;
            }

            for (Node input : node.getInputs()) {
                if (visited.add(input)) {
                    queue.add(input);
                }
            }
        }

        return false;
    }

    boolean semanticEqual(Node left, Node right, boolean deep) {
        if (left == right) {
            return true;
        }

        if (left == null || right == null) {
            return false;
        }

        if (left.getClass() != right.getClass() || left.getInputs().size() != right.getInputs().size()) {
            return false;
        }

        if (!compareFields(left, right)) {
            return false;
        }

        List<Node> lefts = left.getInputs();
        List<Node> rights = right.getInputs();

        for (int i = 0; i < lefts.size(); i++) {
            Node leftIn = lefts.get(i);
            Node rightIn = rights.get(i);
            boolean equal = deep ? leftIn.semanticEqual(rightIn, true) : (leftIn == rightIn);

            if (!equal) {
                return false;
            }
        }

        return true;
    }

    String semanticId(Node node) {
        StringBuilder text = new StringBuilder(node.toString());

        for (Node input : node.getInputs()) {
            text.append(input.semanticId());
        }

        return DigestUtils.sha256Hex(text.toString());
    }

    @SneakyThrows
    String text(Node node) {
        StringBuilder builder = new StringBuilder();
        builder.append(node.getClass().getSimpleName());
        builder.append("(");

        int count = 0;
        for (Field field : getFields(node)) {
            if (count++ > 0) {
                builder.append(",");
            }

            Object value = field.get(node);
            String text;

            if (value == null) {
                text = null;
            } else if (value instanceof boolean[] array) {
                text = Arrays.toString(array);
            } else if (value instanceof int[] array) {
                text = Arrays.toString(array);
            } else if (value instanceof double[] array) {
                text = Arrays.toString(array);
            } else if (value instanceof long[] array) {
                text = Arrays.toString(array);
            } else if (value instanceof Object[] array) {
                text = Arrays.deepToString(array);
            } else {
                Util.verify(!value.getClass().isArray());
                text = value.toString();
            }

            builder.append(text);
        }

        builder.append(")");
        return builder.toString();
    }

    @SneakyThrows
    private boolean compareFields(Node left, Node right) {
        boolean equal = true;

        for (Field field : getFields(left)) {
            Class<?> type = field.getType();

            if (type == boolean.class) {
                equal = (field.getBoolean(left) == field.getBoolean(right));
            } else if (type == int.class) {
                equal = (field.getInt(left) == field.getInt(right));
            } else if (type == double.class) {
                equal = (Double.compare(field.getDouble(left), field.getDouble(right)) == 0);
            } else if (type == long.class) {
                equal = (field.getLong(left) == field.getLong(right));
            } else {
                equal = Objects.deepEquals(field.get(left), field.get(right));
            }

            if (!equal) {
                break;
            }
        }

        return equal;
    }

    private Field[] getFields(Node node) {
        Class<? extends Node> type = node.getClass();
        return REGISTRY.computeIfAbsent(type, NodeUtil::introspectFields);
    }

    @SneakyThrows
    @SuppressWarnings("unchecked")
    private Field[] introspectFields(Class<? extends Node> clazz) {
        if (clazz.isAnnotationPresent(NotSemantic.class)) {
            return NODE_ID;
        }

        List<Field> list = new ArrayList<>();

        while (clazz != Node.class) {
            if (!clazz.isAnnotationPresent(NotSemantic.class)) {
                for (Field field : clazz.getDeclaredFields()) {
                    if (introspectField(field)) {
                        field.setAccessible(true);
                        list.add(field);
                    }
                }
            }

            clazz = (Class<? extends Node>) clazz.getSuperclass();
        }

        return list.toArray(Field[]::new);
    }

    private static boolean introspectField(Field field) {
        Class<?> type = field.getType();
        int modifiers = field.getModifiers();

        boolean exclude = Modifier.isStatic(modifiers) || field.isAnnotationPresent(NotSemantic.class);
        boolean allow = (type == boolean.class || type == int.class
                || type == double.class || type == long.class
                || type == Object.class || type == ColumnType.class || type == String.class || type.isEnum()
                || type == boolean[].class || type == int[].class
                || type == double[].class || type == long[].class
                || type == String[].class || type.isArray());

        if (exclude) {
            return false;
        }

        if (!allow) {
            throw new IllegalArgumentException("Unsupported field type: " + type
                    + ". Declared in: " + field.getDeclaringClass());
        }

        return true;
    }

    @SneakyThrows
    private Field field(Class<? extends Node> clazz, String name) {
        Field field = clazz.getDeclaredField(name);
        field.setAccessible(true);
        return field;
    }
}
