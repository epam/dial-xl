import { ReactElement, ReactNode } from 'react';

import { FilesMetadata, ForkedFrom } from '@frontend/common';
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
  Errors = 'error',
  CodeEditor = 'editor',
  UndoRedo = 'undoRedo',
  Chat = 'chat',
  Details = 'details',
  Project = 'project',
}

export const PanelTitle: Record<PanelName, string> = {
  [PanelName.Errors]: 'Errors',
  [PanelName.CodeEditor]: 'Editor',
  [PanelName.UndoRedo]: 'History',
  [PanelName.Chat]: 'Chat',
  [PanelName.Details]: 'Details',
  [PanelName.Project]: 'Project',
};

export type PanelRecord = Record<PanelName, PanelInfo>;

export type MinimizedPanelProps = {
  name: PanelName;
  title: string | JSX.Element;
  icon: JSX.Element;
};

export type PanelProps = {
  isActive: boolean;
  position?: PanelPosition;
  panelName: PanelName;
  title: string | ReactNode;
  secondaryTitle?: string;
};

export type LayoutPanelProps = {
  initialPosition?: PanelPosition;
  component: React.FunctionComponent<PanelProps>;
  icon: JSX.Element;
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
  existingProjectNames?: string[];
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
export type NewFolderModalRefFunction = (args: {
  path: string | null;
  bucket: string;
  newFolderName?: string;
  silent?: boolean;
}) => void;

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

export type ForkedProjectSettings = ForkedFrom & {
  isExists: boolean;
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
  isChart?: boolean;
}

export enum SelectedCellType {
  EmptyCell = 'empty_cell',
  Cell = 'cell',
  Field = 'field',
  Table = 'table',
  Override = 'override',
  Total = 'total',
}

export type ColorSchema = 'read' | 'review' | 'default';
export const LongCalcStatus = {
  NeedAccept: 'need_accept' as const,
  Accepted: 'accepted' as const,
  Cancelled: 'cancelled' as const,
  None: null as null,
};

export type LongCalcStatus =
  (typeof LongCalcStatus)[keyof typeof LongCalcStatus];
