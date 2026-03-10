export const minTablePlacement = 1;

export type FieldItem = {
  id: string;
  name: string;
};

export type ContainerId = string;

export type OnMoveItem = (
  itemId: string,
  sourceContainer: ContainerId,
  targetContainer: ContainerId,
) => void;
