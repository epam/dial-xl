package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ExecutorService;

@Service
@Slf4j
public class ProjectManager {

    private final Engine engine;

    @Autowired
    public ProjectManager(Engine engine) {
        this.engine = engine;
    }

    public ProjectContext create(Principal principal, ResultListener listener, Map<String, String> sheets) {
        return new ProjectContext(engine, listener, principal, sheets);
    }

    public DataStore getDataStore() {
        return engine.getDataStore();
    }

    public ExecutorService getExecutorService() {
        return engine.getExecutorService();
    }

}
