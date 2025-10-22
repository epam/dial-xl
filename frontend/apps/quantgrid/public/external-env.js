const dialBaseUrl = 'https://dev-dial-core.staging.deltixhub.io';
// const dialOverlayUrl = 'http://localhost:3000'; // Local chat
const dialOverlayUrl = 'https://dev-dial-chat-overlay.staging.deltixhub.io';

const authScope = 'openid dial profile email offline_access';
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

// Staging env
const authAuthority =
  'https://dev-dial-keycloak.staging.deltixhub.io/realms/EPAM';
const authClientId = 'quantgrid';
const authProvider = 'keycloak';
const qgBotDeploymentName = 'qgbot';

// Review env
// const qgBotDeploymentName = 'qg';
// const authProvider = 'auth0';
// const authAuthority = 'https://chatbot-ui-staging.eu.auth0.com';
// const authClientId = 'CWg7UOOe8VuN5yTX23GiUs3fxW5BVqU8';
