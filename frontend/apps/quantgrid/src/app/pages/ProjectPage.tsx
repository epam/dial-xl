import { ReactNode, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CodeEditorContextProvider } from '@frontend/common';

import { Project, ProjectModals } from '../components';
import {
  AIHintsContextProvider,
  AppSpreadsheetInteractionContextProvider,
  CanvasSpreadsheetContextProvider,
  ChatOverlayContextProvider,
  InputsContextProvider,
  LayoutContextProvider,
  ProjectContext,
  ProjectContextProvider,
  UndoRedoProvider,
  ViewportContextProvider,
} from '../context';
import { routeParams, routes } from '../types';

export function ProjectPage() {
  return (
    <ViewportContextProvider>
      <ProjectContextProvider>
        <CanvasSpreadsheetContextProvider>
          <UndoRedoProvider>
            <AIHintsContextProvider>
              <AppSpreadsheetInteractionContextProvider>
                <InputsContextProvider>
                  <ChatOverlayContextProvider>
                    <CodeEditorContextProvider
                      dialBaseUrl={window.externalEnv.dialBaseUrl || ''}
                    >
                      <LayoutContextProvider>
                        <ProjectPageWrapper>
                          <Project />
                          <ProjectModals />
                        </ProjectPageWrapper>
                      </LayoutContextProvider>
                    </CodeEditorContextProvider>
                  </ChatOverlayContextProvider>
                </InputsContextProvider>
              </AppSpreadsheetInteractionContextProvider>
            </AIHintsContextProvider>
          </UndoRedoProvider>
        </CanvasSpreadsheetContextProvider>
      </ProjectContextProvider>
    </ViewportContextProvider>
  );
}

function ProjectPageWrapper({ children }: { children: ReactNode }) {
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

  return children;
}
