package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.web.service.HeartbeatService;
import com.epam.deltix.quantgrid.web.service.compute.ComputeService;
import com.epam.deltix.quantgrid.web.service.input.ImportService;
import com.epam.deltix.quantgrid.web.utils.ApiMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.epam.deltix.proto.Api;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;

@Slf4j
@RestController
@RequiredArgsConstructor
@ConditionalOnProperty(value = "web.cluster.nodeType", havingValue = "CONTROL")
public class ImportControlController {

    private final ImportService importer;
    private final HeartbeatService heartbeater;

    @PostMapping(value = "/v1/list_import_definitions", consumes = "application/json")
    public String getImportDefinitions(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportDefinitionListRequest,
                Api.ImportDefinitionList.class);
        Api.Response response = importer.getImportDefinitions(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/get_import_definition", consumes = "application/json")
    public String getImportDefinition(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportDefinitionGetRequest,
                Api.ImportDefinitionGet.class);
        Api.Response response = importer.getImportDefinition(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/list_import_sources", consumes = "application/json")
    public String getImportSources(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSourceListRequest,
                Api.ImportSourceList.class);
        Api.Response response = importer.getImportSources(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/get_import_source", consumes = "application/json")
    public String getImportSource(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSourceGetRequest,
                Api.ImportSourceGet.class);
        Api.Response response = importer.getImportSource(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/create_import_source", consumes = "application/json")
    public String createImportSource(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSourceCreateRequest,
                Api.ImportSourceCreate.class);
        Api.Response response = importer.createImportSource(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/update_import_source", consumes = "application/json")
    public String updateImportSource(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSourceUpdateRequest,
                Api.ImportSourceUpdate.class);
        Api.Response response = importer.updateImportSource(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/delete_import_source", consumes = "application/json")
    public String deleteImportSource(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSourceDeleteRequest,
                Api.ImportSourceDelete.class);
        Api.Response response = importer.deleteImportSource(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/test_import_connection", consumes = "application/json")
    public String testImportConnection(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportConnectionTestRequest,
                Api.ImportConnectionTest.class);
        Api.Response response = importer.testImportConnection(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/list_import_catalog", consumes = "application/json")
    public String getImportCatalog(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportCatalogListRequest,
                Api.ImportCatalogList.class);
        Api.Response response = importer.getImportCatalog(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/discover_import_dataset", consumes = "application/json")
    public String discoverImportDataset(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportDatasetDiscoverRequest,
                Api.ImportDatasetDiscover.class);
        Api.Response response = importer.discoverImportDataset(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/list_import_syncs", consumes = "application/json")
    public String getImportSyncs(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSyncListRequest,
                Api.ImportSyncList.class);
        Api.Response response = importer.getImportSyncs(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/get_import_sync", consumes = "application/json")
    public String getImportSync(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSyncGetRequest,
                Api.ImportSyncGet.class);
        Api.Response response = importer.getImportSync(principal, request);
        return ApiMessageMapper.toJson(response);
    }

    @PostMapping(value = "/v1/start_import_sync", consumes = "application/json", produces = "text/event-stream")
    public SseEmitter startImportSync(Principal principal, @RequestBody String body) {
        SseEmitter emitter = new SseEmitter(importer.timeout());
        try {
            log.info("Received import sync start request: {}", body);
            Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSyncStartRequest,
                    Api.ImportSyncStart.class);

            heartbeater.addEmitter(emitter);
            SseCallback callback = new SseCallback(heartbeater, emitter);

            ComputeService.ComputeTask task = importer.startImportSync(principal, request, callback);
            emitter.onTimeout(task::cancel);
            emitter.onError(e -> task.cancel());

            return emitter;
        } catch (Throwable e) {
            heartbeater.removeEmitter(emitter);
            throw e;
        }
    }

    @PostMapping(value = "/v1/cancel_import_sync", consumes = "application/json")
    public String cancelImportSync(Principal principal, @RequestBody String body) {
        Api.Request request = ApiMessageMapper.parseRequest(body, Api.Request::getImportSyncCancelRequest,
                Api.ImportSyncCancel.class);
        Api.Response response = importer.cancelImportSync(principal, request);
        return ApiMessageMapper.toJson(response);
    }
}