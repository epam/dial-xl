package com.epam.deltix.quantgrid.engine.cache;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.Table;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class LocalCache implements Cache {

    private final ConcurrentMap<Identity, Entry> map = new ConcurrentHashMap<>();
    private long sequence;

    @Override
    public int size() {
        return map.size();
    }

    @Override
    public void begin() {
        sequence++;
    }

    @Override
    public void finish() {
        List<Identity> ids = new ArrayList<>();
        for (Map.Entry<Identity, Entry> entry : map.entrySet()) {
            if (entry.getValue().sequence < sequence) {
                ids.add(entry.getKey());
            }
        }

        for (Identity id : ids) {
            map.remove(id);
        }
    }

    @Nullable
    @Override
    public Table load(Identity id) {
        Entry entry = map.get(id);
        if (entry == null) {
            return null;
        }

        entry.sequence = sequence;
        return entry.value;
    }

    @Override
    public void save(Identity id, Table value) {
        Entry entry = new Entry(value, sequence);
        Entry prev = map.put(id, entry);
        Util.verify(prev == null);
    }

    @Override
    public Cache copy() {
        LocalCache cache = new LocalCache();
        cache.map.putAll(map);
        cache.sequence = sequence;
        return cache;
    }

    public void clear() {
        map.clear();
    }

    private static class Entry {

        private final Table value;
        private long sequence;

        public Entry(Table value, long sequence) {
            this.value = value;
            this.sequence = sequence;
        }
    }
}
