import { OverrideValue } from '@frontend/parser';

export const getIsAIFunctionsInExpression = (
  expression: string | OverrideValue
) => {
  if (typeof expression !== 'string') {
    return false;
  }

  return /AILIST|AIVALUE/.test(expression);
};
