package com.epam.deltix.quantgrid.web.service.compute;

import lombok.Data;

@Data
public class ClusterNodeEvent {

    private ClusterNodeState state;
    private Action action;

    public enum Action {
        JOIN, LEAVE
    }
}