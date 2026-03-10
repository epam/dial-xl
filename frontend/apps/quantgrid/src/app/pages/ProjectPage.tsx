import { ReactNode, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

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
  SettingsGate,
  UndoRedoProvider,
  UserSettingsSyncProvider,
  ViewportContextProvider,
} from '../context';
import { routeParams, routes } from '../types';

export function ProjectPage() {
  return (
    <UserSettingsSyncProvider>
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
                        <SettingsGate>
                          <LayoutContextProvider>
                            <ProjectPageWrapper>
                              <Project />
                              <ProjectModals />
                            </ProjectPageWrapper>
                          </LayoutContextProvider>
                        </SettingsGate>
                      </CodeEditorContextProvider>
                    </ChatOverlayContextProvider>
                  </InputsContextProvider>
                </AppSpreadsheetInteractionContextProvider>
              </AIHintsContextProvider>
            </UndoRedoProvider>
          </CanvasSpreadsheetContextProvider>
        </ProjectContextProvider>
      </ViewportContextProvider>
    </UserSettingsSyncProvider>
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
    [searchParams],
  );
  const urlProjectBucket = useMemo(
    () => searchParams.get(routeParams.projectBucket),
    [searchParams],
  );

  useEffect(() => {
    // Guard: Only run if we're actually on the project route
    // This prevents stale effects from running during React Router v7 transitions
    // https://github.com/remix-run/react-router/issues/12552
    if (!window.location.pathname.startsWith(routes.project)) {
      return;
    }

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
  }, []);

  if (!projectName) return null;

  return children;
}
