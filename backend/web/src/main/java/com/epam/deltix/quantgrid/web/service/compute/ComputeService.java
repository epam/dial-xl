package com.epam.deltix.quantgrid.web.service.compute;

import org.epam.deltix.proto.Api;

import java.security.Principal;

public interface ComputeService {

    ComputeTask compute(Api.Request request, ComputeCallback callback, Principal principal);

    interface ComputeTask {

        void cancel();
    }

    interface ComputeCallback {

        void onUpdate(Api.Response response);

        void onComplete();

        void onFailure(Throwable error);
    }
}