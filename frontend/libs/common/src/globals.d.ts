interface Window {
  externalEnv: {
    dialOverlayUrl?: string;
    authClientId?: string;
    authClientSecret?: string;
    authAuthority?: string;
    authProvider?: string;
    dialBaseUrl?: string;
    qgBotDeploymentName?: string;
    adminRoles?: string[];
    featureFlags?: FeatureFlag[];
    defaultPanelsSettings?: PanelRecord;
    defaultLeftPanelSize?: number;
    defaultRightPanelSize?: number;
  };
}
