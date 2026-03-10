package com.epam.quantgrid.input.annotate;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Setting {

    String title();

    String description() default "";

    int order();

    boolean required();

    boolean writeOnly() default false;

}