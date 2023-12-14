package com.epam.deltix.quantgrid.web.service;

import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.web.exception.NotFoundException;
import com.epam.deltix.quantgrid.web.exception.VersionConflictException;
import com.epam.deltix.quantgrid.web.service.storage.ProjectStorage;
import com.epam.deltix.quantgrid.web.service.storage.Worksheet;
import com.epam.deltix.quantgrid.web.state.ProjectContext;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.google.common.annotations.VisibleForTesting;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;

@Service
@Slf4j
public class ProjectManager {

    private final ConcurrentMap<String, ProjectContext> projects = new ConcurrentHashMap<>();

    private final ProjectStorage projectStorage;
    private final MetadataProvider metadataProvider;
    private final SubscriptionManager subscriptionManager;
    private final ExecutorService engineExecutorService;

    @Autowired
    public ProjectManager(ProjectStorage projectStorage, MetadataProvider metadataProvider,
                          SubscriptionManager subscriptionManager, ExecutorService engineExecutorService) {
        this.projectStorage = projectStorage;
        this.metadataProvider = metadataProvider;
        this.subscriptionManager = subscriptionManager;
        this.engineExecutorService = engineExecutorService;
        loadProjectsFromStorage();
    }

    private void loadProjectsFromStorage() {
        List<String> projectNames = projectStorage.getAllProjectNames();
        for (String projectName : projectNames) {
            log.info("Loading stored project: {}", projectName);
            List<Worksheet> worksheets = projectStorage.loadWorksheets(projectName);
            ProjectContext projectContext =
                    new ProjectContext(projectName, worksheets, projectStorage, metadataProvider, subscriptionManager, engineExecutorService);
            projects.put(projectName, projectContext);
        }
    }

    public ProjectContext get(String projectName) {
        ProjectContext project = projects.get(projectName);
        if (project == null) {
            throw new NotFoundException("Project " + projectName + " not found");
        }

        return project;
    }

    public ProjectContext create(String projectName) {
        synchronized (projects) {
            boolean hasProjectName = projects.containsKey(projectName);

            if (hasProjectName) {
                throw new IllegalArgumentException("Project " + projectName + " already exist");
            }

            ProjectContext project = new ProjectContext(projectName, projectStorage, metadataProvider, subscriptionManager, engineExecutorService);
            projectStorage.saveWorksheets(projectName, List.of());
            projects.put(projectName, project);

            return project;
        }
    }

    public ProjectContext rename(ProjectContext project, String newProjectName, long version) {
        synchronized (projects) {
            boolean hasProjectName = projects.containsKey(newProjectName);
            if (hasProjectName) {
                throw new IllegalArgumentException("Project " + newProjectName + " already exist");
            }
            validateProvidedVersion(version, project);

            projectStorage.renameProject(project.getProjectName(), newProjectName);

            project.incrementVersion();
            projects.remove(project.getProjectName());
            project.setProjectName(newProjectName);
            projects.put(newProjectName, project);

            return project;
        }
    }

    public ProjectContext delete(String projectName, long version) {
        ProjectContext project = projects.get(projectName);

        validateProvidedVersion(version, project);

        projectStorage.deleteProject(projectName);

        project.incrementVersion();

        return projects.remove(projectName);
    }

    // must be called under project lock
    public void checkIfNotDeleted(String projectName) {
        // check if project exists in project manager due to concurrent delete request processing.
        // in some cases project might be deleted from ProjectManager, but this request was waiting for a lock
        boolean containsProject = projects.containsKey(projectName);

        if (!containsProject) {
            throw new NotFoundException("Project " + projectName + " not found");
        }
    }

    public Set<String> getAllProjectNames() {
        return projects.keySet();
    }

    @VisibleForTesting
    public void invalidateAll() {
        projects.clear();
    }

    private void validateProvidedVersion(long providedVersion, ProjectContext project) {
        long actualVersion = project.getVersion();
        if (actualVersion != providedVersion) {
            throw new VersionConflictException(providedVersion, actualVersion,
                    ApiMessageMapper.toProjectState(project, !projects.containsKey(project.getProjectName())));
        }
    }
}
