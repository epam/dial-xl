package com.epam.deltix.quantgrid.web.config;

import com.epam.deltix.quantgrid.engine.executor.ExecutorUtil;
import com.epam.deltix.quantgrid.engine.service.InputMetadataCache;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalMetadataProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.web.service.RequestDispatcher;
import com.epam.deltix.quantgrid.web.service.SubscriptionManager;
import com.epam.deltix.quantgrid.web.service.WebSocketMessageHandler;
import com.epam.deltix.quantgrid.web.service.storage.InputStorage;
import com.epam.deltix.quantgrid.web.service.storage.LocalInputStorage;
import com.epam.deltix.quantgrid.web.service.storage.LocalProjectStorage;
import com.epam.deltix.quantgrid.web.service.storage.ProjectStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import java.nio.file.Path;
import java.util.concurrent.ExecutorService;

@Configuration
public class BeanConfiguration {

    @Bean
    public ServletServerContainerFactoryBean webSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        // 32 MB buffer
        container.setMaxTextMessageBufferSize(32 * 1024 * 1024);
        return container;
    }

    @Bean
    public WebSocketMessageHandler webSocketMessageHandler(RequestDispatcher requestDispatcher,
                                                           SubscriptionManager subscriptionManager) {
        return new WebSocketMessageHandler(requestDispatcher, subscriptionManager);
    }

    @Bean
    public ProjectStorage projectStorage(@Value("${web.storage.local.projectsFolder}") String projectsFolder) {
        return new LocalProjectStorage(Path.of(projectsFolder));
    }

    @Bean
    public InputStorage inputStorage(@Value("${web.storage.local.inputsFolder}") String inputsFolder) {
        return new LocalInputStorage(Path.of(inputsFolder));
    }

    @Bean
    public MetadataProvider metadataProvider(@Value("${web.storage.local.inputsFolder}") String inputsFolder) {
        return new LocalMetadataProvider(Path.of(inputsFolder));
    }

    @Bean
    public InputMetadataCache inputMetadataCache(MetadataProvider metadataProvider) {
        return new InputMetadataCache(metadataProvider);
    }

    @Bean
    public ExecutorService engineExecutorService() {
        return ExecutorUtil.fixedThreadExecutor();
    }
}
