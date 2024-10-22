import { useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { routeParams } from '../../AppRoutes';
import { ProjectContext } from '../context';

export function SharePage() {
  const navigate = useNavigate();
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();

  const { acceptShareProject, acceptShareFiles } = useContext(ProjectContext);

  const urlProjectPath = useMemo(
    () => searchParams.get(routeParams.projectPath),
    [searchParams]
  );
  const urlProjectName = useMemo(
    () => searchParams.get(routeParams.projectName),
    [searchParams]
  );
  const urlProjectBucket = useMemo(
    () => searchParams.get(routeParams.projectBucket),
    [searchParams]
  );

  useEffect(() => {
    if (shareId && urlProjectBucket && urlProjectName) {
      acceptShareProject({
        invitationId: shareId,
        projectBucket: urlProjectBucket,
        projectName: urlProjectName,
        projectPath: urlProjectPath,
      });
    } else if (shareId) {
      acceptShareFiles({ invitationId: shareId });
    } else {
      toast.error('Incorrect share link used. Please recheck it and try again');

      navigate('/');

      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
