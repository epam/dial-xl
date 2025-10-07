package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

public record Compilation(Map<ParsedKey, CompiledResult> results,
                          Collection<FieldKey> indices,
                          Map<ParsedKey, CompileError> errors,
                          Map<ParsedKey, String> hashes,
                          Map<ParsedKey, Set<ParsedKey>> references,
                          Graph graph) {
}