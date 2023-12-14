import { Argument, FunctionInfo } from '@frontend/common';

import { languages } from '../../monaco';

const getFunctionDefinition = (name: string, args: Argument[]): string => {
  return `${name}(${args.map((arg) => arg.name).join(', ')})`;
};

const getFunctionDescription = (description: string): string => {
  return `**Function Description**\n${description}`;
};

const getArgumentDocs = (arg: Argument): string => {
  const optional = arg.optional ? '*Optional*\n' : '';
  const repeatable = arg.repeatable ? '*Repeatable*\n' : '';
  const title = '**Parameter Description**\n';

  return `${optional}${repeatable}${title}${arg.description}`;
};

export const getFunctionSignature = (
  functionInfo: FunctionInfo
): languages.SignatureInformation => {
  const replaceNewlines = (content: string): string =>
    content.replaceAll('\n', '\\\n');

  const { arguments: args, description, name } = functionInfo;

  return {
    label: replaceNewlines(getFunctionDefinition(name, args)),
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
