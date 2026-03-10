import { Message, Stage } from '@epam/ai-dial-overlay';

export type GPTSuggestion = {
  sheetName: string;
  userMessage?: string;
  dsl: string;
};

export interface GPTFocusColumn {
  tableName: string;
  columnName: string;
  sheetName: string;
}

export interface GPTState {
  projectState: {
    sheets: Record<string, string>;
    inputs: { [fileName: string]: { fields: string[] } };
    inputFolder?: string;
    currentSheet: string;
    currentProjectName: string;
    selection: {
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
    } | null;
    selectedTableName: string | undefined;
  };
  generationParameters?: {
    question_status: 'ACCEPTED' | 'UNDECIDED' | 'DISCARDED';

    generate_summary: boolean | null;
    generate_focus: boolean | null;
    generate_standalone_question: boolean | null;
    generate_actions: boolean | null;

    saved_stages: Stage[];
  };
}

export interface GPTStageState {
  generation_parameters: GPTState['generationParameters'];
  project_state: Omit<GPTState['projectState'], 'selection'> & {
    selection: {
      start_col: number;
      start_row: number;
      end_col: number;
      end_row: number;
    };
  };
}

export interface CompletionBodyRequest {
  stream: boolean;
  messages: Message[];
  custom_fields?: {
    configuration?: {
      generationParameters?: {
        summarize: boolean;
      };
    };
  };
}
