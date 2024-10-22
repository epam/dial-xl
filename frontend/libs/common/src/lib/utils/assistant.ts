import { Message, Stage } from '@epam/ai-dial-overlay';

import { GPTSuggestion } from '../types';

function getSheetNameFromTitle(title: string): string | undefined {
  const firstBracketIndex = title.indexOf('(');
  const lastBracketIndex = title.indexOf(')');

  if (firstBracketIndex === -1 || lastBracketIndex === -1) return;

  return title.slice(firstBracketIndex + 1, lastBracketIndex);
}

function prepareDSL(data: string) {
  if (data.slice(0, 3) === '```') {
    // 4, because 1 symbol in data is \n
    return data.slice(4, data.length - 3);
  }

  return data;
}

export const getSuggestions = (
  messages: Message[]
): { suggestions: GPTSuggestion[]; isCompleted: boolean } => {
  let isCompleted = false;
  const suggestions = [] as GPTSuggestion[];

  if (!messages.length)
    return {
      suggestions,
      isCompleted,
    };

  const lastAnswer = messages[messages.length - 1];

  const lastUserMessage = messages.reduceRight(
    (acc: Message | null, curr: Message) =>
      curr.role === 'user' && !acc ? curr : acc,
    null
  );

  const stages = lastAnswer?.custom_content?.stages;
  const attachments = stages
    ? stages[stages.length - 1]?.attachments
    : undefined;

  if (!attachments)
    return {
      suggestions,
      isCompleted,
    };

  if (!stages?.length || stages[stages.length - 1].status === 'completed') {
    isCompleted = true;
  }

  for (const { data, title } of attachments) {
    if (typeof data === 'string') {
      const sheetName = getSheetNameFromTitle(title || '');

      suggestions.push({
        sheetName,
        userMessage: lastUserMessage?.content,
        dsl: prepareDSL(data),
      });
    }
  }

  return {
    suggestions,
    isCompleted,
  };
};

const mergeStages = (sourceStages: Stage[], newStages: Stage[]) => {
  const sourceStagesReducer = sourceStages.reduce((acc, curr) => {
    acc[curr.index] = curr;

    return acc;
  }, {} as Record<number, Stage>);

  newStages.forEach((stage) => {
    if (sourceStagesReducer[stage.index]) {
      if (stage.attachments) {
        sourceStagesReducer[stage.index].attachments = (
          sourceStagesReducer[stage.index].attachments || []
        ).concat(stage.attachments);
      }

      if (stage.content) {
        sourceStagesReducer[stage.index].content =
          (sourceStagesReducer[stage.index].content || '') + stage.content;
      }

      if (stage.name) {
        sourceStagesReducer[stage.index].name =
          (sourceStagesReducer[stage.index].name || '') + stage.name;
      }

      if (stage.status) {
        sourceStagesReducer[stage.index].status = stage.status;
      }
    } else {
      sourceStagesReducer[stage.index] = stage;
    }
  });

  return Object.values(sourceStagesReducer);
};

export const mergeMessages = (
  source: Message,
  newMessages: Partial<Message>[]
) => {
  const newSource = structuredClone(source);
  newMessages.forEach((newData) => {
    if (newData.role) {
      newSource.role = newData.role;
    }
    if (newData.content) {
      if (!newSource.content) {
        newSource.content = '';
      }
      newSource.content += newData.content;
    }

    if (newData.custom_content) {
      if (!newSource.custom_content) {
        newSource.custom_content = {};
      }

      if (newData.custom_content.attachments) {
        if (!newSource.custom_content.attachments) {
          newSource.custom_content.attachments = [];
        }

        newSource.custom_content.attachments =
          newSource.custom_content.attachments.concat(
            newData.custom_content.attachments
          );
      }

      if (newData.custom_content.stages) {
        if (!newSource.custom_content.stages) {
          newSource.custom_content.stages = [];
        }
        newSource.custom_content.stages = mergeStages(
          newSource.custom_content.stages,
          newData.custom_content.stages
        );
      }

      if (newData.custom_content.state) {
        newSource.custom_content.state = newData.custom_content.state;
      }
    }
  });

  return newSource;
};
