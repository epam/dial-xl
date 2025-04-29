package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
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

    private final InputProvider inputProvider;
    private final ExecutorService engineExecutorService;
    private final Cache engineCache;

    @Autowired
    public ProjectManager(InputProvider inputProvider,
                          ExecutorService engineExecutorService,
                          Cache engineCache) {
        this.inputProvider = inputProvider;
        this.engineExecutorService = engineExecutorService;
        this.engineCache = engineCache;
    }

    public ProjectContext create(Principal principal, ResultListener listener, Map<String, String> worksheets) {
        return new ProjectContext(principal, listener, worksheets, inputProvider, engineExecutorService, engineCache);
    }
}
