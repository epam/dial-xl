// eslint-disable-next-line simple-import-sort/imports
import 'reflect-metadata';

import { ConfigProvider } from 'antd';
import Bowser from 'bowser';
import { WebStorageStateStore } from 'oidc-client-ts';
import * as ReactDOM from 'react-dom/client';
import { AuthProvider, AuthProviderProps } from 'react-oidc-context';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { CodeEditorContextProvider } from '@frontend/common';

import {
  AIHintsContextProvider,
  ApiContextProvider,
  AppContextProvider,
  AppSpreadsheetInteractionContextProvider,
  CanvasSpreadsheetContextProvider,
  InputsContextProvider,
  Loader,
  ProjectContextProvider,
  SearchWindowContextProvider,
  UndoRedoProvider,
  ViewportContextProvider,
} from './app';
import { AppRoutes } from './AppRoutes';

import { Log } from 'oidc-client-ts';
Log.setLevel(Log.ERROR);
Log.setLogger(console);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const browser = Bowser.getParser(window.navigator.userAgent);
const isAuth0 = window.externalEnv.authAuthority?.includes('auth0');
const extraQueryParams = isAuth0
  ? {
      extraQueryParams: {
        audience: 'chat',
      },
    }
  : undefined;

// Clear url params from auth params
const search = new URLSearchParams(window.location.search);
search.delete('state');
search.delete('session_state');
search.delete('code');
const finalSearchParams = search.size > 0 ? '?' + search.toString() : '';
//

const oidcConfig: AuthProviderProps = {
  authority: window.externalEnv.authAuthority || '',
  client_id: window.externalEnv.authClientId || '',
  redirect_uri: encodeURI(
    window.location.origin + window.location.pathname + finalSearchParams
  ),
  automaticSilentRenew: true,
  // monitorSession: true causing 'error=login_required' in Firefox with infinite loop
  monitorSession: !['Firefox', 'Safari'].includes(browser.getBrowserName()),
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  scope: 'openid dial profile email offline_access',
  ...extraQueryParams,
};

root.render(
  <AuthProvider {...oidcConfig}>
    <BrowserRouter>
      <div className="flex flex-col h-screen overflow-hidden">
        <ConfigProvider wave={{ disabled: true }}>
          <AppContextProvider>
            <ApiContextProvider>
              <ViewportContextProvider>
                <ProjectContextProvider>
                  <CanvasSpreadsheetContextProvider>
                    <UndoRedoProvider>
                      <InputsContextProvider>
                        <AIHintsContextProvider>
                          <AppSpreadsheetInteractionContextProvider>
                            <SearchWindowContextProvider>
                              <CodeEditorContextProvider
                                dialBaseUrl={
                                  window.externalEnv.dialBaseUrl || ''
                                }
                              >
                                <AppRoutes />

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
                          </AppSpreadsheetInteractionContextProvider>
                        </AIHintsContextProvider>
                      </InputsContextProvider>
                    </UndoRedoProvider>
                  </CanvasSpreadsheetContextProvider>
                </ProjectContextProvider>
              </ViewportContextProvider>
            </ApiContextProvider>
          </AppContextProvider>
        </ConfigProvider>
      </div>
    </BrowserRouter>
  </AuthProvider>
);
