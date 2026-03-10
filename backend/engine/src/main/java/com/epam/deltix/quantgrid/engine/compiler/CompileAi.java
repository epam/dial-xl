package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AiListLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.AiValueLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ListLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class CompileAi {

    CompiledResult compileModels(CompileContext context) {
        List<String> models = context.aiProvider().models(context.principal());
        List<Expression> expressions = models.stream().map(model -> (Expression) new Constant(model)).toList();
        Plan scalar = context.scalarLayout().node();
        ListLocal result = new ListLocal(scalar, expressions);
        return new CompiledNestedColumn(result, 0, GeneralFormat.INSTANCE);
    }

    CompiledResult compileList(CompileContext context) {
        List<Plan.Source> sources = new ArrayList<>();
        List<Expression> expressions = new ArrayList<>();
        boolean[] nested = new boolean[context.argumentCount() - 2];

        CompiledSimpleColumn model = context.compileArgument(0, SimpleColumnValidators.STRING);
        CompiledSimpleColumn version = context.hasArgument(1)
                ? context.compileArgument(1, SimpleColumnValidators.STRING_OR_DOUBLE)
                : new CompiledSimpleColumn(new Constant(0), List.of(), GeneralFormat.INSTANCE);

        CompileUtil.verify(model.dimensions().isEmpty(), "model argument must not depend on columns from the current table");
        CompileUtil.verify(version.dimensions().isEmpty(), "version argument must not depend on columns from the current table");

        expressions.add(model.expression());
        expressions.add(version.expression());

        for (int i = 2; i < context.argumentCount(); i++) {
            CompiledColumn arg = context.compileArgument(i, SimpleOrNestedValidators.STRING);
            nested[i - 2] = arg.nested();

            CompileUtil.verify(arg.dimensions().isEmpty(), "Arguments must not depend on columns from the current table");

            if (arg instanceof CompiledNestedColumn column) {
                Plan.Source source = new Plan.Source(column.node(), List.of(column.expression()));
                sources.add(source);
            } else {
                expressions.add(arg.expression());
            }
        }

        Plan.Source scalar = new Plan.Source(context.scalarLayout().node(), expressions);
        sources.add(0, scalar);

        AiListLocal plan = new AiListLocal(context.principal(), context.aiProvider(), sources, nested, null);
        return new CompiledNestedColumn(plan, 0, GeneralFormat.INSTANCE);
    }

    CompiledResult compileValue(CompileContext context) {
        List<Plan.Source> sources = new ArrayList<>();
        List<Expression> scalars = new ArrayList<>();
        List<Expression> simples = new ArrayList<>();
        List<AiValueLocal.ArgType> types = new ArrayList<>();
        List<CompiledColumn> cols = new ArrayList<>();
        List<FieldKey> dims = new ArrayList<>();

        CompiledSimpleColumn model = context.compileArgument(0, SimpleColumnValidators.STRING);
        CompiledSimpleColumn version = context.hasArgument(1)
                ? context.compileArgument(1, SimpleColumnValidators.STRING_OR_DOUBLE)
                : new CompiledSimpleColumn(new Constant(0), List.of(), GeneralFormat.INSTANCE);

        CompileUtil.verify(model.dimensions().isEmpty(), "model argument must not depend on columns from the current table");
        CompileUtil.verify(version.dimensions().isEmpty(), "version argument must not depend on columns from the current table");

        scalars.add(model.expression());
        scalars.add(version.expression());

        for (int i = 2; i < context.argumentCount(); i++) {
            CompiledColumn arg = context.compileArgument(i, SimpleOrNestedValidators.STRING);

            if (arg instanceof CompiledNestedColumn column) {
                CompileUtil.verify(arg.dimensions().isEmpty(), "Array arguments must not depend on columns from the current table");
                Plan.Source source = new Plan.Source(column.node(), List.of(column.expression()));
                sources.add(source);
                types.add(AiValueLocal.ArgType.NESTED);
            } else if (arg.scalar()){
                scalars.add(arg.expression());
                types.add(AiValueLocal.ArgType.SCALAR);
            } else {
                cols.add(arg);
                types.add(AiValueLocal.ArgType.SIMPLE);
                dims = context.combine(dims, arg.dimensions());
            }
        }

        for (CompiledColumn col : cols) {
            CompiledColumn promoted = context.promote(col, dims).cast(CompiledSimpleColumn.class);
            simples.add(promoted.expression());
        }

        Plan.Source scalar = new Plan.Source(context.scalarLayout().node(), scalars);
        Plan.Source layout = new Plan.Source(context.layout(dims).node(), simples);
        sources.add(0, scalar);
        sources.add(1, layout);

        AiValueLocal plan = new AiValueLocal(context.principal(), context.aiProvider(),
                sources, types.toArray(AiValueLocal.ArgType[]::new), null);

        return new CompiledSimpleColumn(new Get(plan, 0), dims, GeneralFormat.INSTANCE);
    }
}