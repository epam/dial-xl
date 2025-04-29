import { FeatureFlag } from '../types';

export const isFeatureFlagEnabled = (flag: FeatureFlag): boolean => {
  return (window.externalEnv?.featureFlags ?? []).includes(flag);
};
