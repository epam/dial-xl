export type ColumnRef = {
  id: string;
  name: string;
};

export type ValueFunctionItem = {
  id: string;
  functionName?: string;
  args: Array<ColumnRef | null>;
};

export type AggregationFunctionInfo = {
  name: string;
  argCount: number;
};
