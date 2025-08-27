package com.epam.deltix.quantgrid.engine.executor;

import lombok.experimental.StandardException;

/**
 * Must be deterministic, otherwise throw a different exception.
 */
@StandardException
public class ExecutionError extends RuntimeException {
}