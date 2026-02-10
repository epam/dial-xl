package com.epam.quantgrid.input.s3;

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
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.Map;

@Setter
@Getter
@Input(name = "s3", title = "Amazon S3")
public class S3Input implements DataInput {
    private static final int PAGE_SIZE = 1000;

    @Setting(title = "Bucket", order = 1, required = true, description = "The S3 bucket to access data")
    private String bucket;
    @Setting(title = "Region", order = 2, required = false, description = "The AWS region of the S3 bucket")
    private String region;
    @Setting(title = "Access Key", order = 3, required = true, writeOnly = true, description = "The AWS access key ID")
    private String accessKeyId;
    @Setting(title = "Secret Key", order = 4, required = true, writeOnly = true, description = "The AWS secret access key")
    private String secretAccessKey;

    protected S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .build();
    }

    @Override
    public DataCatalog getCatalog(String token) {
        try (S3Client s3 = s3Client()) {
            DataCatalog catalog = new DataCatalog();
            do {
                ListObjectsV2Request request = ListObjectsV2Request.builder()
                        .bucket(bucket)
                        .startAfter(token)
                        .maxKeys(PAGE_SIZE)
                        .build();
                ListObjectsV2Response response = s3.listObjectsV2(request);
                for (S3Object s3Object : response.contents()) {
                    if (FileUtils.isCsv(s3Object.key())) {
                        DataCatalog.Dataset dataset = new DataCatalog.Dataset();
                        dataset.setPath(s3Object.key());
                        dataset.setType(DataCatalog.Dataset.Type.FILE);
                        catalog.getDatasets().add(dataset);
                    }
                }
                token = response.nextContinuationToken();
            } while (token != null && !token.isBlank() && catalog.getDatasets().size() < PAGE_SIZE);
            catalog.setNext(token);
            return catalog;
        }
    }

    @Override
    public DataSchema getSchema(String dataset) throws IOException {
        if (!FileUtils.isCsv(dataset)) {
            throw new IllegalArgumentException("Only CSV files are supported: " + dataset);
        }

        try (S3Client s3 = s3Client()) {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(dataset)
                    .build();
            try (Reader reader = new BufferedReader(new InputStreamReader(s3.getObject(request)))) {
                Map<String, InputColumnType> schema = CsvInputParser.inferSchema(reader, false);
                DataSchema result = new DataSchema();
                schema.forEach((name, type) ->
                        result.addColumn(new DataSchema.Column(name, type.getDisplayName(), type)));
                return result;
            }
        }
    }

    @Override
    public DataStream getStream(String dataset, DataSchema schema) throws IOException {
        if (!FileUtils.isCsv(dataset)) {
            throw new IllegalArgumentException("Only CSV files are supported: " + dataset);
        }

        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(dataset)
                .build();
        try (S3Client s3Client = s3Client();
            Reader reader = new BufferedReader(new InputStreamReader(s3Client.getObject(request)))) {
            return CsvStream.create(schema, reader);
        }
    }

}
