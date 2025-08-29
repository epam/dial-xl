import { Argument, FunctionInfo } from '@frontend/common';

import { languages } from '../../monaco';

const getFunctionDefinition = (
  name: string,
  args: Argument[],
  isMethodInvocation: boolean
): string => {
  if (isMethodInvocation && args.length > 0) {
    const [firstArg, ...restArgs] = args;

    return `${firstArg.name}.${name}(${restArgs
      .map((arg) => arg.name)
      .join(', ')})`;
  }

  return `${name}(${args.map((arg) => arg.name).join(', ')})`;
};

const getFunctionDescription = (description: string): string => {
  return `${description}`;
};

const getArgumentDocs = (arg: Argument): string => {
  const optional = arg.optional ? '*Optional*' : '';
  const repeatable = arg.repeatable ? '*Repeatable*' : '';

  const modificators = [optional, repeatable].filter(Boolean).join(', ');

  const description = `**${arg.name}**\n${arg.description}`;

  return `${modificators ? `${modificators}\n` : ''}${description}`;
};

export const getFunctionSignature = (
  functionInfo: FunctionInfo,
  isMethodInvocation = false
): languages.SignatureInformation => {
  const replaceNewlines = (content: string): string =>
    content.replaceAll('\n', '\\\n');

  const { arguments: allArgs, description, name } = functionInfo;
  const args = isMethodInvocation ? allArgs.slice(1) : allArgs;

  return {
    label: replaceNewlines(
      getFunctionDefinition(name, allArgs, isMethodInvocation)
    ),
    documentation: {
      value: replaceNewlines(getFunctionDescription(description)),
    },
    parameters: args.map((arg) => ({
      label: arg.name,
      documentation: {
        value: replaceNewlines(getArgumentDocs(arg)),
      },
    })),
  };
};

export const missingSignature: languages.SignatureInformation = {
  label: 'No Defined Signature For This Function',
  documentation: {
    value: 'Missing documentation.',
  },
  parameters: [],
};
