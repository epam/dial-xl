package com.epam.deltix.quantgrid.web.service.compute;

import lombok.Data;

@Data
public class ClusterNodeState {

    private String id;
    private String endpoint;
    private long timestamp;

}