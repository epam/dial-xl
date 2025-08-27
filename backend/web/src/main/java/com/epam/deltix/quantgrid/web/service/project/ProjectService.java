package com.epam.deltix.quantgrid.web.service.project;

import org.epam.deltix.proto.Api;

import java.security.Principal;

public interface ProjectService {

    void calculate(Principal principal, Api.Request apiRequest) throws Exception;

    void cancel(Principal principal, Api.Request apiRequest) throws Exception;
}