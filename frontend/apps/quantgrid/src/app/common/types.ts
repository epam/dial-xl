import { ReactElement } from 'react';

import { FilesMetadata } from '@frontend/common';
import { OverrideValue } from '@frontend/parser';

// Project Panels

export enum PanelPosition {
  Left = 'left',
  Right = 'right',
  Bottom = 'bottom',
}

export type PanelInfo = {
  isActive: boolean;
  position?: PanelPosition;
};

export enum PanelName {
  ProjectTree = 'project',
  Inputs = 'inputs',
  Errors = 'error',
  CodeEditor = 'editor',
  UndoRedo = 'undoRedo',
  Chat = 'chat',
}

export type PanelRecord = Record<PanelName, PanelInfo>;

export type MinimizedPanelProps = {
  name: PanelName;
  title?: string | JSX.Element;
};

export type PanelProps = {
  position: PanelPosition;
  panelName: PanelName;
  title: string;
  secondaryTitle?: string;
};

export type LayoutPanelProps = {
  initialPosition?: PanelPosition;
  component: React.FunctionComponent<PanelProps>;
  title: string;
  inactive?: boolean;
};

export type PanelPositionProps = {
  active: ReactElement[];
  minimized: MinimizedPanelProps[];
};

export type PanelSettings = Record<PanelName, LayoutPanelProps>;

// Modals

export type ModalRefFunction = (onSuccess?: () => void) => void;
export type NewProjectModalRefFunction = (args: {
  projectPath?: string | null;
  projectBucket: string;
  onSuccess?: () => void;
  openInNewTab?: boolean;
}) => void;
export type RenameModalRefFunction = (name: string) => void;
export type DeleteModalRefFunction = (args: {
  name: string;
  onSuccess?: () => void;
}) => void;
export type DeleteProjectModalRefFunction = (args: {
  name: string;
  projectPath: string | null | undefined;
  projectBucket: string;
  onSuccess?: () => void;
}) => void;
export type ShareModalRefFunction = (
  resources: Omit<FilesMetadata, 'resourceType' | 'url'>[]
) => void;

// Dashboard

export type DashboardSortType =
  | 'name'
  | 'contentLength'
  | 'updatedAt'
  | 'parentPath';

export type DashboardTab =
  | 'recent'
  | 'home'
  | 'sharedByMe'
  | 'sharedWithMe'
  | 'examples';

export type DashboardFilter =
  | 'all'
  | 'folders'
  | 'projects'
  | 'files'
  | 'csvFiles';

export type FileReference = {
  name: string;
  bucket: string;
  path: string | null | undefined;
};

// Selected Cell

export interface SelectedCell {
  type: SelectedCellType;
  col: number;
  row: number;
  tableName?: string;
  value?: string;
  fieldName?: string;
  overrideIndex?: number;
  overrideValue?: OverrideValue;
  totalIndex?: number;
  isDynamic?: boolean;
}

export enum SelectedCellType {
  EmptyCell = 'empty_cell',
  Cell = 'cell',
  Field = 'field',
  Table = 'table',
  Override = 'override',
  Total = 'total',
}
