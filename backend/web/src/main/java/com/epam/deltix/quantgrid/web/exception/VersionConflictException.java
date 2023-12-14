package com.epam.deltix.quantgrid.web.exception;

import lombok.Getter;
import org.epam.deltix.proto.Api;
import org.jetbrains.annotations.Nullable;


@Getter
/**
 * Throws when project/worksheet update is not possible due to project version mismatch.
 * In most cases holds either project or worksheet state.
 * Exceptional case - creating new worksheet with incorrect version, in this case both states are null.
 */
public class VersionConflictException extends RuntimeException {

    private static final String DEFAULT_ERROR_MESSAGE_TEMPLATE =
            "Provided project version %d does not match actual version %s";

    @Nullable
    private final Api.ProjectState projectState;
    @Nullable
    private final Api.WorksheetState worksheetState;

    public VersionConflictException(long providedVersion, long actualVersion, Api.ProjectState projectState) {
        this(providedVersion, actualVersion, projectState, null);
    }

    public VersionConflictException(long providedVersion, long actualVersion,
                                    @Nullable Api.WorksheetState worksheetState) {
        this(providedVersion, actualVersion, null, worksheetState);
    }

    private VersionConflictException(long providedVersion,
                                     long actualVersion,
                                     Api.ProjectState projectState,
                                     Api.WorksheetState worksheetState) {
        super(String.format(DEFAULT_ERROR_MESSAGE_TEMPLATE, providedVersion, actualVersion));
        this.projectState = projectState;
        this.worksheetState = worksheetState;
    }
}
