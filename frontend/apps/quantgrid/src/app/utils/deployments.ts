import { deploymentsEndpointPrefix } from '@frontend/common';

export const getDeploymentRouteSegments = () => {
  return [
    deploymentsEndpointPrefix,
    window.externalEnv.qgBotDeploymentName,
    'route',
    'v1',
  ];
};
