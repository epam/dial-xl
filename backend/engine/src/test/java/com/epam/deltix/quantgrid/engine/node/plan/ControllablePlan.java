package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@NotSemantic
public class ControllablePlan extends Plan1<Value, Value> {

    private final CountDownLatch started = new CountDownLatch(1);
    private final CountDownLatch execution = new CountDownLatch(1);

    private final Plan original;

    public ControllablePlan(Plan original) {
        super(original);
        this.original = original;
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return original.getMeta();
    }

    @Override
    protected Value execute(Value original) {
        try {
            started.countDown();
            execution.await(10, TimeUnit.SECONDS);
            return original;
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    public void release() {
        execution.countDown();
    }

    public void await() {
        try {
            started.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
