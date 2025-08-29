package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import lombok.experimental.UtilityClass;

@UtilityClass
public class TableValidators {
    public final ResultValidator<CompiledTable> NESTED =
            ResultValidator.tableValidator(TableValidators::validateNested)
                    .withTypeDisplayName("%s or %s".formatted(
                            CompileUtil.getResultTypeDisplayName(CompiledTable.class),
                            CompileUtil.getResultTypeDisplayName(CompiledNestedColumn.class)));
    public final ResultValidator<CompiledTable> NESTED_TABLE =
            ResultValidator.tableValidator(TableValidators::validateNestedTable);
    public final ResultValidator<CompiledTable> TABLE =
            ResultValidator.tableValidator(TableValidators::validateTable);

    private void validateNested(CompiledTable compiledTable) {
        if (!compiledTable.nested()) {
            throw new CompileError("expected %s.".formatted(
                    CompileUtil.getResultTypeDisplayName(compiledTable.getClass())));
        }
    }

    private void validateTable(CompiledTable compiledTable) {
        if (compiledTable instanceof CompiledNestedColumn) {
            throw new CompileError("expected %s, but got %s.".formatted(
                    CompileUtil.getResultTypeDisplayName(CompiledTable.class),
                    CompileUtil.getResultTypeDisplayName(compiledTable)));
        }
    }

    private void validateNestedTable(CompiledTable compiledTable) {
        validateTable(compiledTable);
        validateNested(compiledTable);
    }
}