package com.epam.deltix.quantgrid.web.service.compute;

import org.epam.deltix.proto.Api;

import java.io.OutputStream;
import java.security.Principal;
import java.util.function.Supplier;

public interface ComputeService {

    long timeout();

    ComputeTask compute(Api.Request request, ComputeCallback callback, Principal principal) throws ComputeException;

    Api.Response search(Api.Request request, Principal principal) throws ComputeException;

    void download(Api.Request request, Supplier<OutputStream> output, Principal principal) throws ComputeException;

    interface ComputeTask {

        void cancel();
    }

    interface ComputeCallback {

        void onUpdate(Api.Response response);

        void onComplete();

        void onFailure(Throwable error);
    }
}