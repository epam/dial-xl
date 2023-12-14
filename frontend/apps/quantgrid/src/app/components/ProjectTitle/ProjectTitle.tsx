import { useContext } from 'react';

import { ProjectContext } from '../../context';

export function ProjectTitle() {
  const { projectName, sheetName } = useContext(ProjectContext);

  return (
    <div className="project-title w-full text-center text-stone-600 text-sm">
      {projectName && (
        <>
          <span>Project: </span>
          <span className="font-bold">{projectName}</span>
          {sheetName && (
            <>
              <span> | Sheet: </span>
              <span className="font-bold">{sheetName}</span>
            </>
          )}
        </>
      )}
      {!projectName && <span>No opened project</span>}
    </div>
  );
}
