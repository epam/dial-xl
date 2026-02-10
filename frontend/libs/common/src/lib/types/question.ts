import { Role } from '@epam/ai-dial-overlay';

export enum QuestionStatus {
  UNDECIDED = 'UNDECIDED',
  ACCEPTED = 'ACCEPTED',
  DISCARDED = 'DISCARDED',
}

export interface QuestionMetadata {
  question_file: string;
  status: QuestionStatus;
  reviewed: boolean;
  name: string;
}

export interface Question {
  id: string;
  question_file: string;
  name: string;
  timestamp: string;
  status: QuestionStatus;
  reviewed: boolean;
  history: {
    content: string;
    role: Role;
  }[];
  question: string;
  answer: string;
  original_sheets: Record<string, string>;
  solution_sheets: Record<string, string>;
  focus: {
    sheet_name: string;
    table_name: string;
    column_name: string;
  }[];
}
