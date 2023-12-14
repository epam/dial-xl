import { DimensionalSchemaResponse } from '@frontend/common';

export interface ApiResponseMessage {
  data: MessageEvent<string>['data'];
}

export interface CellEditorUpdateValueMessage {
  value: string;
  cancelEdit: boolean;
}

export interface EventBusMessages {
  ApiResponse: ApiResponseMessage;
  CellEditorUpdateValue: CellEditorUpdateValueMessage;
  DimensionalSchemaResponse: DimensionalSchemaResponse;
}
