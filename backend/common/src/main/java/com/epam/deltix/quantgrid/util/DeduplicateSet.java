package com.epam.deltix.quantgrid.util;

import it.unimi.dsi.fastutil.objects.ObjectLinkedOpenHashSet;

public class DeduplicateSet<T> {

    private final ObjectLinkedOpenHashSet<T> set;
    private final int capacity;

    public DeduplicateSet() {
        this(4096);
    }

    public DeduplicateSet(int capacity) {
        this.set = new ObjectLinkedOpenHashSet<>();
        this.capacity = capacity;
    }

    public T add(T value) {
        if (value == null) {
            return null;
        }

        boolean added = set.addAndMoveToLast(value);

        if (added && set.size() > capacity) {
            set.removeFirst();
        }

        return added ? value : set.get(value);
    }
}