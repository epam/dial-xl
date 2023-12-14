import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { CodeEditorContextProvider } from '@frontend/common';

import {
  ApiContextProvider,
  App,
  AppContextProvider,
  DashboardPage,
  ErrorPage,
  InputsContextProvider,
  Loader,
  ProjectContextProvider,
  SearchWindowContextProvider,
  SpreadsheetContextProvider,
  UndoRedoProvider,
  ViewportContextProvider,
} from './app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <BrowserRouter>
    <div className="flex flex-col h-screen overflow-hidden">
      <AppContextProvider>
        <ApiContextProvider>
          <ViewportContextProvider>
            <ProjectContextProvider>
              <UndoRedoProvider>
                <InputsContextProvider>
                  <SpreadsheetContextProvider>
                    <SearchWindowContextProvider>
                      <CodeEditorContextProvider>
                        <Routes>
                          <Route element={<DashboardPage />} path="/" />
                          <Route
                            element={<App />}
                            path="/:projectName/:sheetName?"
                          />
                          <Route element={<ErrorPage />} path="*" />
                        </Routes>

                        <ToastContainer
                          autoClose={10000}
                          hideProgressBar={true}
                          limit={5}
                          position="bottom-right"
                          theme="colored"
                          closeOnClick
                        />
                        <Loader />
                      </CodeEditorContextProvider>
                    </SearchWindowContextProvider>
                  </SpreadsheetContextProvider>
                </InputsContextProvider>
              </UndoRedoProvider>
            </ProjectContextProvider>
          </ViewportContextProvider>
        </ApiContextProvider>
      </AppContextProvider>
    </div>
  </BrowserRouter>
);
