package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.cache.SoftCache;
import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.service.input.storage.DialInputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalInputProvider;
import com.epam.deltix.quantgrid.util.DialFileApi;
import okhttp3.OkHttpClient;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.web.client.RestTemplate;

import java.net.MalformedURLException;
import java.nio.file.Path;
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
    public DialFileApi dialFileApi(@Value("${web.storage.dial.baseUrl}") String dialBaseUrl) {
        return new DialFileApi(dialBaseUrl);
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public InputProvider dialInputProvider(DialFileApi dialFileApi) {
        return new DialInputProvider(dialFileApi);
    }

    @Bean
    @ConditionalOnMissingBean(InputProvider.class)
    public InputProvider localInputProvider(@Value("${web.storage.local.inputsFolder}") String inputsFolder) {
        return new LocalInputProvider(Path.of(inputsFolder));
    }

    @Bean
    public ExecutorService engineExecutorService() {
        return ExecutorUtil.fixedThreadExecutor();
    }

    @Bean
    @ConditionalOnDialStorageEnabled
    public AuthenticationManager authenticationManager(
            @Value("${web.storage.dial.baseUrl}") String dialBaseUrl,
            OkHttpClient okHttpClient) throws MalformedURLException {
        return new ProviderManager(List.of(new ApiKeyAuthenticationProvider(dialBaseUrl, okHttpClient)));
    }

    @Bean
    @ConditionalOnMissingBean(AuthenticationManager.class)
    public AuthenticationManager noOpAuthenticationManager() {
        return authentication -> null;
    }

    @Bean
    public Cache engineCache() {
        return new SoftCache();
    }

    @Bean
    public OkHttpClient okHttpClient(@Value("${web.heartbeatPeriodMillis}") long heartbeatPeriod) {
        return new OkHttpClient.Builder()
                .readTimeout(Duration.ofMillis(2 * heartbeatPeriod)) // Default is 10 seconds
                .build();
    }
}