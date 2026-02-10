package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.engine.Engine;
import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.cache.SoftCache;
import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.node.plan.local.EmbeddingIndexLocal;
import com.epam.deltix.quantgrid.engine.service.input.storage.DataStore;
import com.epam.deltix.quantgrid.engine.service.ai.AiProvider;
import com.epam.deltix.quantgrid.engine.service.ai.DialAiProvider;
import com.epam.deltix.quantgrid.engine.service.ai.LocalAiProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.ImportProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialDataStore;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialImportProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialInputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.dial.DialSchemaStore;
import com.epam.deltix.quantgrid.engine.service.input.storage.local.LocalDataStore;
import com.epam.deltix.quantgrid.engine.service.input.storage.local.LocalImportProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.local.LocalInputProvider;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.store.dial.DialLock;
import com.epam.deltix.quantgrid.engine.store.dial.DialStore;
import com.epam.deltix.quantgrid.engine.store.local.LocalStore;
import com.epam.deltix.quantgrid.util.DialFileApi;
import io.kubernetes.client.openapi.ApiClient;
import okhttp3.Dispatcher;
import okhttp3.OkHttpClient;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutorService;
import javax.annotation.Nullable;

@Configuration
@EnableScheduling
public class BeanConfiguration {

    @Bean
    @Nullable
    public RedissonClient redis(@Value("${web.redis:#{null}}") String config) throws Exception {
        return (config == null) ? null : Redisson.create(Config.fromYAML(config));
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public DialFileApi dialFileApi(@Value("${web.storage.dial.baseUrl}") String dialBaseUrl, OkHttpClient okHttpClient) {
        return new DialFileApi(dialBaseUrl, okHttpClient);
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public InputProvider dialInputProvider(DialFileApi dialFileApi, DialSchemaStore schemaStore) {
        return new DialInputProvider(dialFileApi, schemaStore);
    }

    @Bean
    @ConditionalOnMissingBean(InputProvider.class)
    public InputProvider localInputProvider(@Value("${web.storage.local.inputsFolder}") String inputsFolder) {
        return new LocalInputProvider(Path.of(inputsFolder));
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public DialImportProvider dialImportProvider(DialFileApi api, DataStore dataStore) {
        return new DialImportProvider(api, dataStore);
    }

    @Bean
    @ConditionalOnMissingBean(ImportProvider.class)
    public ImportProvider localImportProvider() {
        return new LocalImportProvider();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public AiProvider dialAiProvider(@Value("${web.storage.dial.baseUrl}") String dialBaseUrl, OkHttpClient okHttpClient) {
        return new DialAiProvider(okHttpClient, dialBaseUrl);
    }

    @Bean
    @ConditionalOnMissingBean(AiProvider.class)
    public AiProvider localAiProvider() {
        return new LocalAiProvider();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public AuthenticationManager authenticationManager(
            @Value("${web.storage.dial.baseUrl}") String dialBaseUrl,
            OkHttpClient okHttpClient) throws MalformedURLException {
        return new ProviderManager(List.of(new DialAuthProvider(dialBaseUrl, okHttpClient)));
    }

    @Bean
    @ConditionalOnMissingBean(AuthenticationManager.class)
    public AuthenticationManager noOpAuthenticationManager() {
        return authentication -> null;
    }

    @Bean
    public Engine engine(InputProvider inputProvider, ImportProvider importProvider, AiProvider aiProvider,
                         Store store, DataStore dataStore) {
        SoftCache cache = new SoftCache();
        ExecutorService executor = ExecutorUtil.fixedThreadExecutor();
        ExecutorService indexExecutor = ExecutorUtil.indexThreadExecutor();
        GraphCallback callback = new GraphCallback() {
        };
        return new Engine(cache, executor, indexExecutor, callback, inputProvider, importProvider, aiProvider,
                store, EmbeddingIndexLocal.class::isInstance, dataStore);
    }

    @Bean
    public OkHttpClient okHttpClient(
            @Value("${web.client.connectTimeout:10000}") long connectTimeout,
            @Value("${web.client.readTimeout:120000}") long readTimeout,
            @Value("${web.client.writeTimeout:10000}") long writeTimeout,
            @Value("${web.client.callTimeout:600000}") long callTimeout,
            @Value("${web.client.maxRequestsPerHost:256}") int maxRequestsPerHost,
            @Value("${web.client.maxRequestsTotal:256}") int maxRequestsTotal) {

        Dispatcher dispatcher = new Dispatcher();
        dispatcher.setMaxRequestsPerHost(maxRequestsPerHost);
        dispatcher.setMaxRequests(maxRequestsTotal);

        return new OkHttpClient.Builder()
                .dispatcher(dispatcher)
                .connectTimeout(Duration.ofMillis(connectTimeout))
                .readTimeout(Duration.ofMillis(readTimeout))
                .writeTimeout(Duration.ofMillis(writeTimeout))
                .callTimeout(Duration.ofMillis(callTimeout))
                .build();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public DialStore dialResultStore(
            Clock clock,
            DialFileApi dialFileApi,
            @Value("${web.storage.dial.appKey}") String key,
            @Value("${web.storage.dial.results.path:.cache/}") String resultsPath,
            @Value("${web.storage.dial.results.lock.accessTtl:300s}") Duration accessLockTtl,
            @Value("${web.storage.dial.results.lock.accessRefreshInterval:150s}") Duration refreshInterval,
            @Value("${web.storage.dial.results.lock.deleteTtlSec:60s}") Duration deleteLockTtl,
            @Value("${web.storage.dial.results.cleanup.deleteAfter:7d}") Duration deleteAfter) {
        DialToken dialToken = new DialToken("api-key", key);
        DialLock lock = new DialLock(clock, dialFileApi, accessLockTtl, deleteLockTtl);
        return new DialStore(clock, dialFileApi, lock, dialToken, resultsPath, refreshInterval, deleteAfter);
    }

    @Bean
    @ConditionalOnMissingBean(Store.class)
    public LocalStore localResultStore(@Value("${web.storage.local.resultsFolder}") String resultsFolder) {
        return new LocalStore(Path.of(resultsFolder));
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public DialDataStore dialDataStore(DialFileApi dialFileApi) {
        return new DialDataStore(dialFileApi);
    }

    @Bean
    @ConditionalOnMissingBean(DataStore.class)
    public LocalDataStore localDataStore() {
        return new LocalDataStore();
    }

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    @Lazy
    public ApiClient kubernetesApiClient() throws IOException {
        return io.kubernetes.client.util.Config.defaultClient();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public DialSchemaStore schemaStoreApi(
            Clock clock,
            DialFileApi dialFileApi,
            @Value("${web.storage.dial.appKey}") String key,
            @Value("${web.storage.dial.input_metadata.path:.input_metadata/}") String path,
            @Value("${web.storage.dial.input_metadata.cleanup.updateAfter:15d}") Duration updateAfter,
            @Value("${web.storage.dial.input_metadata.cleanup.deleteAfter:30d}") Duration deleteAfter) {
        DialToken dialToken = new DialToken("api-key", key);
        return new DialSchemaStore(clock, dialFileApi, dialToken, path, updateAfter, deleteAfter);
    }
}