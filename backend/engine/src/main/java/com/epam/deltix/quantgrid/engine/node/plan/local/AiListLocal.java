package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotDeterministic;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.service.ai.AiProvider;
import com.epam.deltix.quantgrid.engine.service.ai.AiUtil;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Strings;

import java.security.Principal;
import java.util.List;

public class AiListLocal extends PlanN<Table, Table> implements NotDeterministic {

    private static final String INSTRUCTION =
            "Answer must be a minified JSON array of strings (no commentary, no markdown, no code fences)";

    @NotSemantic
    private final Principal principal;
    @NotSemantic
    private final AiProvider provider;
    private final boolean[] nested;
    private final String link;

    public AiListLocal(Principal principal, AiProvider provider,
                       List<Source> sources, boolean[] nested, String link) {
        super(sources);
        this.principal = principal;
        this.provider = provider;
        this.nested = nested;
        this.link = link;
    }

    @Override
    public AiListLocal withLink(String link) {
        return new AiListLocal(principal, provider, sources(), nested, link);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING));
    }

    @Override
    protected Table execute(List<Table> args) {
        int nestedIndex = 1;
        int scalarIndex = 2;

        StringColumn models = expression(0, 0).evaluate();
        String model = models.get(0);

        Util.verify(models.size() == 1);
        Util.verify(!Strings.isError(model), "model is error");
        Util.verify(!Strings.isEmpty(model), "model is empty");

        StringBuilder prompt = new StringBuilder();

        for (int i = 0; i < nested.length; i++) {
            if (i != 0) {
                prompt.append(" ");
            }

            if (nested[i]) {
                StringColumn values = expression(nestedIndex++, 0).evaluate();
                String json = AiUtil.toJsonArray(values);
                prompt.append(json);
            } else {
                StringColumn values = expression(0, scalarIndex++).evaluate();
                String value = values.get(0);
                prompt.append(value);
            }
        }

        String json = provider.generate(principal, model, INSTRUCTION, prompt.toString());
        StringColumn result = AiUtil.fromJsonArray(AiUtil.sanitize(json));
        return new LocalTable(result);
    }
}
