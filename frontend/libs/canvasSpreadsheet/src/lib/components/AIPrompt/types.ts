export interface AIPromptAction {
  label: React.ReactNode;
  key?: React.Key | null;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  isPrompt?: boolean;
  onClick?: () => void;
}

export interface AIPromptSection {
  section: string;
  items: AIPromptAction[];
}
