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
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AiValueLocal extends PlanN<Table, Table> implements NotDeterministic {

    private static final String INSTRUCTION = "Answer questions precisely (no commentary, no markdown, no code fences). "
            + "Input is JSON object, field is question number, value is question. "
            + "Output is JSON object, field is question number, value is answer "
            + "(null - unknown answer, numeric - numeric answer, text - text answer)";

    private static final int BATCH = 64;

    @NotSemantic
    private final Principal principal;
    @NotSemantic
    private final AiProvider provider;
    private final ArgType[] types;
    private final String link;

    public AiValueLocal(Principal principal, AiProvider provider, List<Source> sources, ArgType[] types, String link) {
        super(sources);
        this.principal = principal;
        this.provider = provider;
        this.types = types;
        this.link = link;
    }

    @Override
    public AiValueLocal withLink(String link) {
        return new AiValueLocal(principal, provider, sources(), types, link);
    }

    @Override
    protected Plan layout() {
        return plan(1).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING));
    }

    @Override
    protected Table execute(List<Table> args) {
        int size = Util.toIntSize(args.get(1).size());
        if (size == 0) {
            return new LocalTable(new StringDirectColumn());
        }

        int scalarIndex = 2;
        int simpleIndex = 0;
        int nestedIndex = 2;

        StringColumn models = expression(0, 0).evaluate();
        String model = models.get(0);

        Util.verify(models.size() == 1);
        Util.verify(!Strings.isError(model), "model is error");
        Util.verify(!Strings.isEmpty(model), "model is empty");

        List<StringColumn> simples = new ArrayList<>();
        IntList indices = new IntArrayList();
        StringBuilder template = new StringBuilder();

        for (int i = 0; i < types.length; i++) {
            if (i != 0) {
                template.append(" ");
            }

            switch (types[i]) {
                case SCALAR -> {
                    StringColumn values = expression(0, scalarIndex++).evaluate();
                    String value = values.get(0);
                    template.append(value);
                }
                case SIMPLE -> {
                    indices.add(template.length());
                    simples.add(expression(1, simpleIndex++).evaluate());
                }
                case NESTED -> {
                    StringColumn values = expression(nestedIndex++, 0).evaluate();
                    String json = AiUtil.toJsonArray(values);
                    template.append(json);
                }
            }
        }

        Map<String, String> questions = new HashMap<>();
        StringBuilder question = new StringBuilder();
        String[] result = new String[size];

        for (int i = 0, batch = 0; i < size; i++) {
            question.setLength(0);
            question.append(template);

            for (int j = simples.size() - 1; j >= 0; j--) {
                String chunk = simples.get(j).get(i);
                int index = indices.getInt(j);
                question.insert(index, chunk);
            }

            questions.put(Integer.toString(++batch), question.toString());

            if (batch == BATCH || i == size - 1) {
                String json = provider.generate(principal, model, INSTRUCTION, AiUtil.toJsonMap(questions));
                Map<String, String> answers = AiUtil.fromJsonMap(AiUtil.sanitize(json));

                Util.verify(questions.size() == answers.size(),
                        "Answers size do not match. Expected: %s. Actual: %s. Json: %s",
                        batch, answers.size(), json);

                for (int j = 1; j <= batch; j++) {
                    String key = Integer.toString(j);
                    Util.verify(answers.containsKey(key), "Answer #%s is not found", key);
                    result[i - batch + j] = answers.getOrDefault(key, Strings.ERROR_NA);
                }

                batch = 0;
                questions.clear();
            }
        }

        return new LocalTable(new StringDirectColumn(result));
    }

    public enum ArgType {
        SCALAR, SIMPLE, NESTED
    }
}