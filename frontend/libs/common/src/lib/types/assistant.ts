export type SystemMessageParsedContent = {
  sheets: Record<string, string>;
  inputs: { [fileName: string]: { fields: string[] } };
  currentSheet: string;
  currentProjectName: string;
  selection: {
    startCol: number;
    startRow: number;
    endRow: number;
    endCol: number;
  } | null;
  selectedTableName: string | undefined;
  summarize?: boolean;
};

export type GPTSuggestion = {
  sheetName?: string; // if there is no sheetName in title that mean we should update current sheet
  userMessage?: string;
  dsl: string;
};
