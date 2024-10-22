import { useContext, useMemo } from 'react';

import { ProjectContext } from '../../../context';

export function ProjectTitle() {
  const { projectName, sheetName, projectPermissions } =
    useContext(ProjectContext);

  const isReadOnlyProject = useMemo(
    () => !projectPermissions.includes('WRITE'),
    [projectPermissions]
  );

  return (
    <div className="inline-flex items-center h-full overflow-hidden whitespace-nowrap mx-4 text-stone-600 text-[13px] ">
      {projectName && (
        <>
          <span
            className="text-textSecondary text-ellipsis inline-block overflow-hidden whitespace-nowrap"
            id="projectNameTitle"
          >
            {projectName}
          </span>
          {sheetName && (
            <>
              <span className="text-strokeTertiary mx-3 text-lg"> / </span>
              <span
                className="text-textPrimary text-ellipsis inline-block overflow-hidden whitespace-nowrap"
                id="sheetNameTitle"
              >
                {sheetName}
              </span>
            </>
          )}

          {isReadOnlyProject && (
            <span className="ml-4 rounded-full bg-bgAccentTertiary text-textInverted px-2 py-[3px] text-[10px]">
              READ-ONLY
            </span>
          )}
        </>
      )}
      {!projectName && <span>No opened project</span>}
    </div>
  );
}
