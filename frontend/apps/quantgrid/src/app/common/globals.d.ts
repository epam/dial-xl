import { FeatureFlag } from '@frontend/common';

interface Window {
  externalEnv: {
    dialOverlayUrl?: string;
    authClientId?: string;
    authClientSecret?: string;
    authAuthority?: string;
    authScope?: string;
    apiBaseUrl?: string;
    dialBaseUrl?: string;
    qgBotDeploymentName?: string;
    adminRoles?: string[];
    featureFlags?: FeatureFlag[];
  };
}
