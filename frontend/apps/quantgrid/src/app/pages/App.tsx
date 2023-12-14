import { useCallback, useContext, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { Loader } from '../components';
import { ApiContext, LayoutContextProvider, ProjectContext } from '../context';
import { useApi } from '../hooks';
import { useApiResponse } from '../hooks/useApiResponse';
import { saveRecentSheet } from '../services';
import { ProjectPage } from './ProjectPage';

import '../styles';

export function App() {
  useApiResponse();
  const { projectName } = useContext(ProjectContext);
  const { isConnectionOpened } = useContext(ApiContext);

  const { projectName: urlProjectName, sheetName: urlSheetName } = useParams();
  const { openProject: openProjectRequest } = useApi();

  const openProject = useCallback(() => {
    if (
      !isConnectionOpened ||
      !urlProjectName ||
      urlProjectName === projectName
    )
      return;

    openProjectRequest(urlProjectName);
  }, [isConnectionOpened, openProjectRequest, projectName, urlProjectName]);

  useEffect(() => {
    if (urlSheetName) {
      saveRecentSheet(urlSheetName);
    }

    openProject();
    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectName, urlSheetName]);

  if (!projectName) return null;

  return (
    <LayoutContextProvider>
      <ProjectPage />
      <ToastContainer
        autoClose={10000}
        hideProgressBar={true}
        limit={5}
        position="bottom-right"
        theme="colored"
        closeOnClick
      />
      <Loader />
    </LayoutContextProvider>
  );
}
