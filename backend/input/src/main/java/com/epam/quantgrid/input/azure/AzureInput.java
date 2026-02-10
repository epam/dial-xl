package com.epam.quantgrid.input.azure;

import com.azure.core.http.rest.PagedResponse;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobContainerClientBuilder;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.ListBlobsOptions;
import com.azure.storage.common.StorageSharedKeyCredential;
import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvInputParser;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.quantgrid.input.annotate.Input;
import com.epam.quantgrid.input.annotate.Setting;
import com.epam.quantgrid.input.api.DataCatalog;
import com.epam.quantgrid.input.api.DataInput;
import com.epam.quantgrid.input.api.DataStream;
import com.epam.quantgrid.input.csv.CsvStream;
import com.epam.quantgrid.input.util.FileUtils;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.Map;

@Slf4j
@Setter
@Getter
@Input(name = "azure", title = "Azure Blob Storage")
public class AzureInput implements DataInput {
    private static final int PAGE_SIZE = 1000;

    @Setting(title = "Container", order = 1, required = true, description = "The Azure Blob Storage container to access data")
    private String container;
    @Setting(title = "Account Name", order = 2, required = true, description = "The Azure Storage account name")
    private String accountName;
    @Setting(title = "Account Key", order = 3, required = true, writeOnly = true, description = "The Azure Storage account key")
    private String accountKey;

    protected BlobContainerClient containerClient() {
        return new BlobContainerClientBuilder()
                .endpoint("https://" + accountName + ".blob.core.windows.net")
                .credential(new StorageSharedKeyCredential(accountName, accountKey))
                .containerName(container)
                .buildClient();
    }

    @Override
    public DataCatalog getCatalog(String token) throws IOException {
        DataCatalog catalog = new DataCatalog();
        ListBlobsOptions options = new ListBlobsOptions()
                .setMaxResultsPerPage(PAGE_SIZE);
        do {
            Iterable<PagedResponse<BlobItem>> items = containerClient()
                    .listBlobs(options, token, null)
                    .iterableByPage();
            try (PagedResponse<BlobItem> page = items
                    .iterator()
                    .next()) {
                for (BlobItem blobItem : page.getValue()) {
                    log.info("Found blob: {}", blobItem.getName());
                    if (FileUtils.isCsv(blobItem.getName())) {
                        DataCatalog.Dataset dataset = new DataCatalog.Dataset();
                        dataset.setPath(blobItem.getName());
                        dataset.setType(DataCatalog.Dataset.Type.FILE);
                        catalog.getDatasets().add(dataset);
                    }
                }
                token = page.getContinuationToken();
            }
        } while (token != null && !token.isBlank() && catalog.getDatasets().size() < PAGE_SIZE);
        catalog.setNext(token);
        return catalog;
    }

    @Override
    public DataSchema getSchema(String dataset) throws IOException {
        if (!FileUtils.isCsv(dataset)) {
            throw new IllegalArgumentException("Only CSV files are supported: " + dataset);
        }

        BlobClient blobClient = containerClient().getBlobClient(dataset);
        try (Reader reader = new BufferedReader(new InputStreamReader(blobClient.openInputStream()))) {
            Map<String, InputColumnType> schema = CsvInputParser.inferSchema(reader, false);
            DataSchema result = new DataSchema();
            schema.forEach((name, type) ->
                    result.addColumn(new DataSchema.Column(name, type.getDisplayName(), type)));
            return result;
        }
    }

    @Override
    public DataStream getStream(String dataset, DataSchema schema) throws IOException {
        if (!FileUtils.isCsv(dataset)) {
            throw new IllegalArgumentException("Only CSV files are supported: " + dataset);
        }

        BlobClient blobClient = containerClient().getBlobClient(dataset);
        try (Reader reader = new BufferedReader(new InputStreamReader(blobClient.openInputStream()))) {
            return CsvStream.create(schema, reader);
        }
    }
}
