import { Message, Stage } from '@epam/ai-dial-overlay';

import {
  GPTFocusColumn,
  GPTStageState,
  GPTState,
  GPTSuggestion,
  Highlight,
  HighlightData,
} from '../types';

const getSheetName = (attachmentTitle: string) => {
  const regex = /DSL \((.*)\)/;

  return regex.exec(attachmentTitle)?.[1];
};

function prepareDSL(data: string) {
  const trimmedData = data.trim();
  if (trimmedData.slice(0, 3) === '```') {
    // 4, because 1 symbol in data is \n
    return trimmedData.slice(4, trimmedData.length - 3);
  }

  return trimmedData;
}

function prepareStageContent(data: string) {
  const trimmedData = data.trim();
  if (trimmedData.slice(0, 7) === '```json') {
    // 8, because 1 symbol in data is \n
    return trimmedData.slice(8, trimmedData.length - 3);
  }

  return trimmedData;
}

export const getSuggestions = (messages: Message[]): GPTSuggestion[] => {
  const suggestions = [] as GPTSuggestion[];

  if (!messages.length) return suggestions;

  const lastAnswer = messages[messages.length - 1];

  const lastUserMessage = messages.reduceRight(
    (acc: Message | null, curr: Message) =>
      curr.role === 'user' && !acc ? curr : acc,
    null
  );

  const stages = lastAnswer?.custom_content?.stages;
  const changedSheetsStage = stages?.find(
    (stage) => stage.name.trim() === 'Changed Sheets'
  );
  const attachments = stages ? changedSheetsStage?.attachments : undefined;

  if (!attachments || !changedSheetsStage) return suggestions;

  for (const { data, title } of attachments) {
    if (typeof data === 'string') {
      const sheetName = getSheetName(title)!;

      suggestions.push({
        sheetName,
        userMessage: lastUserMessage?.content,
        dsl: prepareDSL(data),
      });
    }
  }

  return suggestions;
};

export const getInitialState = (messages: Message[]): GPTState | null => {
  if (!messages.length) return null;

  const lastAnswer = messages[messages.length - 1];

  const stages = lastAnswer?.custom_content?.stages;
  const stage = stages?.find((stage) =>
    stage.name.trim().startsWith('Receiving the project state')
  );
  const content = stage?.content && prepareStageContent(stage?.content);

  if (!content) return null;

  let parsedData: GPTStageState;

  try {
    parsedData = JSON.parse(content);

    return {
      projectState: {
        currentProjectName: parsedData.project_state.currentProjectName,
        currentSheet: parsedData.project_state.currentSheet,
        inputFolder: parsedData.project_state.inputFolder,
        inputs: parsedData.project_state.inputs,
        selectedTableName: parsedData.project_state.selectedTableName,
        selection: parsedData.project_state.selection && {
          endCol: parsedData.project_state.selection?.end_col,
          endRow: parsedData.project_state.selection?.end_row,
          startCol: parsedData.project_state.selection?.start_col,
          startRow: parsedData.project_state.selection?.start_row,
        },
        sheets: parsedData.project_state.sheets,
      },
      generationParameters: parsedData.generation_parameters,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Cannot parse focus columns or it has invalid structure', e);

    return null;
  }
};

const getFocusParsedColumns = (messages: Message[]) => {
  if (!messages.length) return [];

  const lastAnswer = messages[messages.length - 1];

  const stages = lastAnswer?.custom_content?.stages;
  const focusStage = stages?.find((stage) => stage.name.trim() === 'Focus');
  const focusContent =
    focusStage?.content && prepareStageContent(focusStage?.content);

  if (!focusContent) return [];

  let parsedData: {
    columns: {
      table_name: string;
      column_name: string;
      sheet_name: string;
    }[];
  };

  try {
    parsedData = JSON.parse(focusContent);

    return parsedData.columns;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Cannot parse focus columns or it has invalid structure', e);

    return [];
  }
};

export const getFocusColumns = (messages: Message[]): GPTFocusColumn[] => {
  return getFocusParsedColumns(messages).map(
    ({ table_name, column_name, sheet_name }) => ({
      tableName: table_name,
      columnName: column_name,
      sheetName: sheet_name,
    })
  );
};

export const getAffectedEntitiesHighlight = (
  messages: Message[]
): Record<string, HighlightData> => {
  if (!messages.length) return {};

  const lastAnswer = messages[messages.length - 1];

  const stages = lastAnswer?.custom_content?.stages;
  const stage = stages?.find((stage) => stage.name.trim() === 'Actions');
  const content = stage?.content && prepareStageContent(stage?.content);

  if (!content) return {};

  let parsedData: {
    root: {
      sheet_name: string;
      table_name: string;
      column_name: string | undefined;
      type: 'RemoveFieldAction' | string | undefined;
    };
  }[];

  try {
    parsedData = JSON.parse(content);

    const changedData = parsedData
      .map((data) => data.root)
      .map((data) => ({ ...data, isFocus: false }));
    const focusData = getFocusParsedColumns(messages).map((data) => ({
      ...data,
      isFocus: true,
      type: undefined as string | undefined,
    }));

    const result = [...focusData, ...changedData].reduce(
      (
        acc: Record<
          string,
          {
            tableChange: boolean;
            tableFocused: boolean;
            changedFields: string[];
            focusedFields: string[];
            deletedFields: string[];
          }
        >,
        curr
      ) => {
        const isDeleted = curr.type === 'RemoveFieldAction';
        const isFocus = curr.isFocus;

        if (!acc[curr.table_name]) {
          acc[curr.table_name] = {
            tableChange: false,
            changedFields: [],
            deletedFields: [],
            focusedFields: [],
            tableFocused: false,
          };
        }

        const prevValue = acc[curr.table_name];

        const changedObj = isFocus
          ? undefined
          : {
              tableChange: prevValue.tableChange || !curr.column_name,
              changedFields: isDeleted
                ? prevValue.changedFields
                : ([...prevValue.changedFields, curr.column_name].filter(
                    Boolean
                  ) as string[]),
              deletedFields: isDeleted
                ? ([...prevValue.deletedFields, curr.column_name].filter(
                    Boolean
                  ) as string[])
                : prevValue.deletedFields,
            };
        const focusedObj = isFocus
          ? {
              focusedFields: [
                ...prevValue.focusedFields,
                curr.column_name,
              ].filter(Boolean) as string[],
              tableFocused: prevValue.tableFocused || !curr.column_name,
            }
          : undefined;

        acc = {
          ...acc,
          [curr.table_name]: {
            ...prevValue,
            ...changedObj,
            ...focusedObj,
          },
        };

        return acc;
      },
      {} as Record<
        string,
        {
          tableChange: boolean;
          tableFocused: boolean;
          changedFields: string[];
          focusedFields: string[];
          deletedFields: string[];
        }
      >
    );

    return Object.entries(result).reduce((acc, [tableName, value]) => {
      const tableHighlight = value.tableFocused
        ? Highlight.HIGHLIGHTED
        : value.tableChange
        ? Highlight.NORMAL
        : undefined;
      const focusedFieldsMapped = value.focusedFields.map((item) => ({
        fieldName: item,
        highlight: Highlight.HIGHLIGHTED,
      }));
      const changedFieldsMapped = value.changedFields.map((item) => ({
        fieldName: item,
        highlight: Highlight.HIGHLIGHTED,
      }));

      acc[tableName] = {
        tableHighlight,
        fieldsHighlight: [...changedFieldsMapped, ...focusedFieldsMapped],
      };

      return acc;
    }, {} as Record<string, HighlightData>);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Cannot parse actions stage or it has invalid structure', e);

    return {};
  }
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
