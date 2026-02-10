package com.epam.quantgrid.input.api;

import com.epam.quantgrid.input.annotate.Input;
import com.epam.quantgrid.input.annotate.Setting;
import com.epam.quantgrid.input.azure.AzureInput;
import com.epam.quantgrid.input.postgres.PostgresInput;
import com.epam.quantgrid.input.s3.S3Input;
import com.epam.quantgrid.input.snowflake.SnowflakeInput;
import com.epam.quantgrid.input.util.DataUtils;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@UtilityClass
public class DataInputs {

    private final List<Class<? extends DataInput>> TYPES_LIST = List.of(
            SnowflakeInput.class,
            PostgresInput.class,
            AzureInput.class,
            S3Input.class
    );
    private final List<DataDefinition> DEFINITIONS_LIST = TYPES_LIST.stream().map(DataInputs::createDefinition).toList();
    private final Map<String, Class<? extends DataInput>> TYPES_MAP = buildTypesMap();
    private final Map<String, DataDefinition> DEFINITIONS_MAP = buildDefinitionsMap();

    public DataDefinition getDefinition(String id) {
        return DEFINITIONS_MAP.get(id);
    }

    public Collection<DataDefinition> getDefinitions() {
        return DEFINITIONS_LIST;
    }

    public DataInput createInput(String id, String json) {
        Class<? extends DataInput> type = TYPES_MAP.get(id);
        Objects.requireNonNull(type, "Data input is not found");
        return createInput(type, json);
    }

    private Map<String, Class<? extends DataInput>> buildTypesMap() {
        HashMap<String, Class<? extends DataInput>> map = new HashMap<>();

        for (int i = 0; i < TYPES_LIST.size(); i++) {
            Class<? extends DataInput> type = TYPES_LIST.get(i);
            DataDefinition definition = DEFINITIONS_LIST.get(i);
            map.put(definition.getId(), type);
        }

        return map;
    }

    private Map<String, DataDefinition> buildDefinitionsMap() {
        HashMap<String, DataDefinition> map = new HashMap<>();

        for (DataDefinition definition : DEFINITIONS_LIST) {
            map.put(definition.getId(), definition);
        }

        return map;
    }

    @SneakyThrows
    public <T extends DataInput> T createInput(Class<T> type, String json) {
        return DataUtils.fromJson(json, type);
    }

    @SneakyThrows
    public DataDefinition createDefinition(Class<? extends DataInput> type) {
        try {
            DataDefinition definition = new DataDefinition();
            BeanInfo bean = Introspector.getBeanInfo(type);
            Input input = type.getAnnotation(Input.class);
            definition.setId(input.name());
            definition.setTitle(input.title());

            List<DataDefinition.Setting> settings = new ArrayList<>();

            for (PropertyDescriptor descriptor : bean.getPropertyDescriptors()) {
                String name = descriptor.getName();
                Method setter = descriptor.getWriteMethod();

                if (name.equals("class") || setter == null) {
                    continue;
                }

                Field field = getField(type, name);
                Setting annotation = setter.getAnnotation(Setting.class);

                if (annotation == null) {
                    annotation = field.getAnnotation(Setting.class);
                }

                if (annotation == null) {
                    continue;
                }

                if (field.getType() != String.class) {
                    throw new IllegalStateException("Type is not supported: " + field.getType());
                }

                DataDefinition.Setting setting = new DataDefinition.Setting();
                setting.setName(name);
                setting.setType(field.getType());
                setting.setTitle(annotation.title());
                setting.setDescription(annotation.description());
                setting.setOrder(annotation.order());
                setting.setRequired(annotation.required());
                setting.setWriteOnly(annotation.writeOnly());
                settings.add(setting);
            }

            settings.sort(Comparator.comparingInt(DataDefinition.Setting::getOrder));
            settings.forEach(setting -> definition.getSettings().put(setting.getName(), setting));

            return definition;
        } catch (Throwable e) {
            throw new IllegalStateException("Failed to infer definition for input: " + type);
        }
    }

    @SneakyThrows
    private static Field getField(Class<?> clazz, String name) {
        while (clazz != Object.class) {
            try {
                return clazz.getDeclaredField(name);
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }

        throw new NoSuchFieldException(name);
    }
}