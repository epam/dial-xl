const authScope = 'openid dial profile email';
const adminRoles = ['admin'];

const defaultLogoUrl = '';

// Available feature flags - frontend/libs/common/src/lib/types/feature-flags.ts
const featureFlags = ['askAI', 'copilotAutocomplete'];
const defaultPanelsSettings = {
  chat: {
    isActive: true,
    position: 'left',
  },
  project: {
    isActive: false,
    position: 'right',
  },
  error: {
    isActive: false,
    position: 'right',
  },
  editor: {
    isActive: false,
    position: 'right',
  },
  undoRedo: {
    isActive: false,
    position: 'right',
  },
  details: {
    isActive: false,
    position: 'right',
  },
};

const defaultLeftPanelSize = 550;
const defaultRightPanelSize = 550;

// DEBUG - 4, INFO - 3, WARN - 2, ERROR - 1, OFF - 0
const logLevel = 1;

// Staging env
// const authAuthority =
//   'https://dev-dial-keycloak.staging.deltixhub.io/realms/EPAM';
// const authClientId = 'quantgrid';
// const authProvider = 'keycloak';
// const qgBotDeploymentName = 'qgbot';
// const apiBaseUrl = 'https://quantgrid-dev.staging.deltixhub.io';
// const dialBaseUrl = 'https://dev-dial-core.staging.deltixhub.io';
// const dialOverlayUrl = 'https://dev-dial-chat-overlay.staging.deltixhub.io';

// New dev env
const authAuthority = 'https://keycloak.aks.dev.dial.parts/realms/dial';
const authClientId = 'dial-xl';
const authProvider = 'keycloak';
const qgBotDeploymentName = 'qgbot';
const apiBaseUrl = 'https://xl.aks.dev.dial.parts';
const dialBaseUrl = 'https://xl.aks.dev.dial.parts/core';
const dialOverlayUrl = 'https://overlay.aks.dev.dial.parts';

// Review env
// const qgBotDeploymentName = 'qg';
// const authProvider = 'auth0';
// const authAuthority = 'https://chatbot-ui-staging.eu.auth0.com';
// const authClientId = 'CWg7UOOe8VuN5yTX23GiUs3fxW5BVqU8';
// const apiBaseUrl = ''; // Update with review env url
