import { AIHint, AIHintTrigger } from '@frontend/common';

export const isHintNameValid = (
  hint: AIHint,
  otherHints: AIHint[]
): boolean => {
  if (!hint.name) return false;

  return otherHints.every(
    (otherHint) => otherHint.name.trim() !== hint.name.trim()
  );
};

export const isTriggerValid = (
  trigger: AIHintTrigger,
  otherTriggers: AIHintTrigger[]
): boolean => {
  return otherTriggers.every(
    (otherHint) => otherHint.value.trim() !== trigger.value.trim()
  );
};

export const isHintTriggersValid = (
  hint: AIHint,
  otherHints: AIHint[]
): boolean => {
  const hintTriggers = hint.triggers;
  const otherHintsTriggers = otherHints.map((hint) => hint.triggers).flat();

  return hintTriggers.every((trigger, index) => {
    const otherTriggers = [
      ...hint.triggers.slice(0, index),
      ...hint.triggers.slice(index + 1),
    ].concat(otherHintsTriggers);

    return isTriggerValid(trigger, otherTriggers);
  });
};

export const isHintSuggestionValid = (hint: AIHint) => {
  return hint.suggestion.trim().length > 0;
};

export const isHintValid = (hint: AIHint, otherHints: AIHint[]): boolean => {
  return (
    isHintNameValid(hint, otherHints) &&
    isHintTriggersValid(hint, otherHints) &&
    isHintSuggestionValid(hint)
  );
};
