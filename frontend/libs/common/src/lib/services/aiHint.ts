export interface AIHintTrigger {
  value: string;
  isDisabled: boolean;
}

export interface AIHint {
  name: string;
  triggers: AIHintTrigger[];
  suggestion: string;
  isDisabled?: boolean;
}
