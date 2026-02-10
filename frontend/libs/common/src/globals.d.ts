interface Window {
  externalEnv: {
    dialOverlayUrl?: string;
    authClientId?: string;
    authClientSecret?: string;
    authAuthority?: string;
    authProvider?: string;
    authScope?: string;
    apiBaseUrl?: string;
    dialBaseUrl?: string;
    qgBotDeploymentName?: string;
    adminRoles?: string[];
    featureFlags?: FeatureFlag[];
    defaultPanelsSettings?: PanelRecord;
    defaultLeftPanelSize?: number;
    defaultRightPanelSize?: number;
    defaultLogoUrl?: string;

    // DEBUG - 4, INFO - 3, WARN - 2, ERROR - 1, OFF - 0
    logLevel?: number;
  };
}
