import { useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { routeParams, routes } from '../../AppRoutes';
import { Project } from '../components';
import { LayoutContextProvider, ProjectContext } from '../context';

export function AppPage() {
  const navigate = useNavigate();
  const { projectName, openProject } = useContext(ProjectContext);

  const { projectName: urlProjectName, sheetName: urlProjectSheetName } =
    useParams();
  const [searchParams] = useSearchParams();

  const urlProjectPath = useMemo(
    () => searchParams.get(routeParams.projectPath),
    [searchParams]
  );
  const urlProjectBucket = useMemo(
    () => searchParams.get(routeParams.projectBucket),
    [searchParams]
  );

  useEffect(() => {
    if (!urlProjectName || !urlProjectBucket) {
      navigate(routes.home);

      return;
    }

    openProject({
      path: urlProjectPath ?? '',
      bucket: urlProjectBucket,
      projectName: urlProjectName,
      projectSheetName: urlProjectSheetName,
    });

    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectPath, urlProjectBucket, urlProjectName]);

  if (!projectName) return null;

  return (
    <LayoutContextProvider>
      <Project />
    </LayoutContextProvider>
  );
}
