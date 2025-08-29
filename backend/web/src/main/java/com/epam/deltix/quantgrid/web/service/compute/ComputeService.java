package com.epam.deltix.quantgrid.web.service.compute;

import org.epam.deltix.proto.Api;

import java.io.OutputStream;
import java.security.Principal;
import java.util.function.Supplier;

public interface ComputeService {

    long timeout();

    ComputeTask compute(Api.Request request, ComputeCallback callback, Principal principal);

    void cancel(Api.Request request, Principal principal);

    Api.Response search(Api.Request request, Principal principal);

    void download(Api.Request request, Supplier<OutputStream> output, Principal principal);

    void export(Api.Request request, Principal principal);

    interface ComputeTask {

        void cancel();
    }

    interface ComputeCallback {

        void onUpdate(Api.Response response);

        void onComplete();

        void onFailure(Throwable error);
    }
}