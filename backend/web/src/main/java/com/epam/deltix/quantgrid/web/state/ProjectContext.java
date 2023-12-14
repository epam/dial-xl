package com.epam.deltix.quantgrid.web.state;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedFormula;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.web.exception.NotFoundException;
import com.epam.deltix.quantgrid.web.exception.VersionConflictException;
import com.epam.deltix.quantgrid.web.model.WorksheetState;
import com.epam.deltix.quantgrid.web.service.ResultSender;
import com.epam.deltix.quantgrid.web.service.SubscriptionManager;
import com.epam.deltix.quantgrid.web.service.storage.ProjectStorage;
import com.epam.deltix.quantgrid.web.service.storage.Worksheet;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import com.google.protobuf.ProtocolStringList;
import it.unimi.dsi.fastutil.Pair;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.jetbrains.annotations.Nullable;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
public class ProjectContext {

    private volatile String projectName;

    // worksheetName, Worksheet
    private final Map<String, WorksheetState> worksheets;

    // must be changed under lock
    private long version = 1;

    private final ResultSender resultSender;

    private final ProjectStorage projectStorage;

    private final SubscriptionManager subscriptionManager;

    private final Engine engine;

    public ProjectContext(String projectName, ProjectStorage projectStorage, MetadataProvider metadataProvider,
                          SubscriptionManager subscriptionManager, ExecutorService engineExecutorService) {
        this(projectName, List.of(), projectStorage, metadataProvider, subscriptionManager, engineExecutorService);
    }

    public ProjectContext(String projectName, List<Worksheet> worksheets, ProjectStorage projectStorage,
                          MetadataProvider metadataProvider, SubscriptionManager subscriptionManager,
                          ExecutorService engineExecutorService) {
        this.projectName = projectName;
        this.worksheets = worksheets.stream()
                .map(w -> new WorksheetState(w.getSheetName(), w.getDsl(), SheetReader.parseSheet(w.getDsl())))
                .collect(Collectors.toMap(WorksheetState::getSheetName, Function.identity()));
        this.projectStorage = projectStorage;
        this.subscriptionManager = subscriptionManager;
        this.resultSender = new ResultSender(subscriptionManager, ExecutorUtil.fixedThreadExecutor(1), projectName);
        this.engine = new Engine(engineExecutorService, resultSender, new GraphCallback() {}, metadataProvider);
    }

    public WorksheetState removeWorksheet(String worksheetName, long version) {
        validateProvidedVersion(version, getWorksheet(worksheetName));
        projectStorage.deleteWorksheet(projectName, worksheetName);
        incrementVersion();
        return worksheets.remove(worksheetName);
    }

    public WorksheetState getWorksheet(String worksheetName) {
        WorksheetState worksheet = worksheets.get(worksheetName);
        if (worksheet == null) {
            throw new NotFoundException("Worksheet " + worksheetName + " not found");
        }
        return worksheet;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String newProjectName) {
        projectName = newProjectName;
        resultSender.setProjectName(newProjectName);
    }

    public long getVersion() {
        return version;
    }

    public Collection<WorksheetState> getWorksheets() {
        return worksheets.values();
    }

    public WorksheetState updateWorksheet(String worksheetName, long version, String content) {
        WorksheetState currentWorksheet = worksheets.get(worksheetName);
        validateProvidedVersion(version, currentWorksheet);

        ParsedSheet parsedSheet = SheetReader.parseSheet(content);
        WorksheetState updatedWorksheet = new WorksheetState(worksheetName, content, parsedSheet);

        projectStorage.saveWorksheet(projectName, updatedWorksheet);

        incrementVersion();

        worksheets.put(worksheetName, updatedWorksheet);

        calculate(getVersion());

        return updatedWorksheet;
    }

    public CompletableFuture<Void> calculate() {
        return calculate(getVersion());
    }

    public CompletableFuture<Void> calculate(long version) {
        Set<Subscription> subscriptions =
                subscriptionManager.getProjectSubscriptionsSnapshot(projectName);

        Set<Viewport> viewPorts = new HashSet<>();
        for (Subscription subscription : subscriptions) {
            if (subscription == null) {
                log.warn("Unexpected NULL Subscription");
                continue;
            }
            Map<String, Api.Viewport> viewports = subscription.getViewports();

            viewports.forEach((table, v) -> {
                ProtocolStringList fields = v.getFieldsList();
                long start = v.getStartRow();
                long end = v.getEndRow();
                boolean content = v.getIsContent();
                fields.forEach(field -> viewPorts.add(new Viewport(table, field, start, end, content)));
            });
        }

        List<ParsedSheet> worksheets = getParsedWorksheets();
        return engine.compute(worksheets, viewPorts, version);
    }

    public WorksheetState renameWorksheet(String oldWorksheetName, String newWorksheetName, long version) {
        if (worksheets.containsKey(newWorksheetName)) {
            throw new IllegalArgumentException("Worksheet " + newWorksheetName + " already exist");
        }

        validateProvidedVersion(version, getWorksheet(oldWorksheetName));

        projectStorage.renameWorksheet(projectName, oldWorksheetName, newWorksheetName);

        incrementVersion();
        WorksheetState worksheet = worksheets.remove(oldWorksheetName);
        WorksheetState renamedWorksheet =
                new WorksheetState(newWorksheetName, worksheet.getDsl(), worksheet.getParsedSheet());
        worksheets.put(newWorksheetName, renamedWorksheet);

        return renamedWorksheet;
    }

    public Api.DimensionalSchemaResponse getFormulaSchema(String textFormula) {
        ParsedFormula parsedFormula = SheetReader.parseFormula(textFormula);
        List<ParsingError> errors = parsedFormula.errors();

        // report errors from parser
        if (!errors.isEmpty()) {
            return Api.DimensionalSchemaResponse.newBuilder()
                    .setProjectName(projectName)
                    .setFormula(textFormula)
                    .setErrorMessage(errors.stream()
                            .map(ParsingError::getMessage)
                            .collect(Collectors.joining(",\n")))
                    .build();
        }

        try {
            Pair<List<String>, List<String>> fieldsAndKeys =
                    engine.getFormulaSchema(parsedFormula.formula(), textFormula, getParsedWorksheets());
            return Api.DimensionalSchemaResponse.newBuilder()
                    .setProjectName(projectName)
                    .setFormula(textFormula)
                    .addAllSchema(fieldsAndKeys.first())
                    .addAllKeys(fieldsAndKeys.second())
                    .build();

        } catch (CompileError error) {
            return Api.DimensionalSchemaResponse.newBuilder()
                    .setProjectName(projectName)
                    .setFormula(textFormula)
                    .setErrorMessage(error.getMessage())
                    .build();
        }
    }

    public long incrementVersion() {
        return version++;
    }

    public Map<FieldKey, String> getCompilationErrors() {
        return engine.getCompilationErrors();
    }

    private List<ParsedSheet> getParsedWorksheets() {
        return worksheets.values()
                .stream()
                .map(WorksheetState::getParsedSheet)
                .toList();
    }

    private void validateProvidedVersion(long providedVersion, @Nullable WorksheetState worksheet) {
        long actualVersion = getVersion();
        if (actualVersion != providedVersion) {
            Api.WorksheetState worksheetState = null;
            if (worksheet != null) {
                worksheetState = ApiMessageMapper.toWorksheetState(projectName, actualVersion, worksheet, Map.of(),
                        !worksheets.containsKey(worksheet.getSheetName()));
            }
            throw new VersionConflictException(providedVersion, actualVersion, worksheetState);
        }
    }
}
