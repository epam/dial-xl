import { Attachment, Stage } from '@epam/ai-dial-overlay';

export enum NormalizedStageNames {
  'CHANGED_SHEETS' = 'Changed Sheets',
  'FOCUS' = 'Focus',
  'SUMMARY' = 'Summary',
}

export const getNormalizedStageName = (name: string) =>
  name.replaceAll(/(\(.*\)+)/g, '').trim();

export const updateChangedSheetsStage = (
  stage: Stage,
  newContent: Record<string, string>
) => {
  const resultedAttachments: Attachment[] = Object.entries(newContent).map(
    ([key, value], index) => ({
      title: `DSL (${key})`,
      type: 'text/markdown',
      data: `\`\`\`\n${value}\n\`\`\``,
      index,
    })
  );

  const resultingStage = {
    ...stage,
    attachments: resultedAttachments,
  };

  return resultingStage;
};

export const updateSummaryStage = (stage: Stage, newContent: string) => {
  const resultingStage: Stage = {
    ...stage,
    content: newContent,
  };

  return resultingStage;
};
