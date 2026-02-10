package com.epam.deltix.quantgrid.web.controller;

import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.web.config.ConditionalOnDialStorageEnabled;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Slf4j
@RestController
@RequiredArgsConstructor
@ConditionalOnDialStorageEnabled
public class BucketController {

    private final DialFileApi dial;

    @GetMapping("/v1/bucket/download")
    public void download(Principal principal, HttpServletResponse response) {
        response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        response.setHeader("Content-Disposition", "attachment; filename=\"bucket.zip\"");

        try (ZipOutputStream output = new ZipOutputStream(response.getOutputStream())) {
            String bucket = dial.getBucket(principal);
            String[] resources = {"files", "conversations"};

            ZipEntry bucketEntry = new ZipEntry("bucket.txt");
            output.putNextEntry(bucketEntry);
            output.write(bucket.getBytes(StandardCharsets.UTF_8));
            output.closeEntry();

            for (String resource : resources) {
                String folder = resource + "/" + bucket + "/";

                for (DialFileApi.Attributes attribute : dial.listAttributes(folder, principal)) {
                    String path = folder + attribute.fullPath();
                    String url = UriUtils.encodePath(path, StandardCharsets.UTF_8);

                    try {
                        ZipEntry entry = new ZipEntry(path);

                        try (EtaggedStream input = dial.readFile(url, principal)) {
                            output.putNextEntry(entry);
                            input.stream().transferTo(output);
                        } catch (FileNotFoundException ignore) {
                            log.warn("File disappeared while downloading bucket: {}", path);
                        }

                        output.closeEntry();
                    } catch (Exception e) {
                        throw new RuntimeException("Error creating zip entry for: " + path, e);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error creating zip file", e);
        }
    }

    @PostMapping("/v1/bucket/upload")
    public ResponseEntity<String> upload(Principal principal, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File must be a zip archive");
        }

        try {
            DumperOptions options = new DumperOptions();
            options.setSplitLines(false);
            Yaml yaml = new Yaml(options);

            String toBucket = dial.getBucket(principal);

            try (ZipInputStream input = new ZipInputStream(file.getInputStream())) {
                ZipEntry entry = input.getNextEntry();

                if (entry == null || !entry.getName().equals("bucket.txt")) {
                    return ResponseEntity.badRequest().body("First entry must be bucket.txt");
                }

                String fromBucket = new String(input.readAllBytes(), StandardCharsets.UTF_8);

                if (fromBucket.isBlank()) {
                    return ResponseEntity.badRequest().body("Bucket is empty");
                }

                for (entry = input.getNextEntry(); entry != null; entry = input.getNextEntry()) {
                    String fromPath = entry.getName();
                    String toPath = fromPath.replace(fromBucket, toBucket);
                    String url = UriUtils.encodePath(toPath, StandardCharsets.UTF_8);
                    String contentType = inferContentType(fromPath);

                    if (!fromPath.contains(fromBucket)) {
                        return ResponseEntity.badRequest().body("Bad zip entry: " + fromPath);
                    }

                    BodyWriter writer;
                    if (fromPath.startsWith("conversations/")) {
                        String content = new String(input.readAllBytes(), StandardCharsets.UTF_8);
                        byte[] bytes = content.replace(fromBucket, toBucket).getBytes(StandardCharsets.UTF_8);
                        writer = out -> out.write(bytes);
                    } else if (fromPath.endsWith(".qg")) { // reformat cause FE splits long lines
                        String content = new String(input.readAllBytes(), StandardCharsets.UTF_8);
                        Object map = yaml.load(content);
                        byte[] bytes = yaml.dump(map).replace(fromBucket, toBucket).getBytes(StandardCharsets.UTF_8);
                        writer = out -> out.write(bytes);
                    } else {
                        writer = input::transferTo;
                    }

                    dial.writeFile(url, "*", writer, contentType, principal);
                    input.closeEntry();
                }
            }

            return ResponseEntity.ok("Bucket has been updated");
        } catch (Exception e) {
            log.warn("Failed to upload bucket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to process the ZIP file: " + e.getMessage());
        }
    }

    private static String inferContentType(String path) {
        if (path.startsWith("conversations")) {
            return "application/json";
        }

        if (path.endsWith(".qg")) {
            return "application/yaml";
        }

        return MediaTypeFactory.getMediaType(path).orElse(MediaType.APPLICATION_OCTET_STREAM).getType();
    }
}
