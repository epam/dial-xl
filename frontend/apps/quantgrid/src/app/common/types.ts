import { ReactElement } from 'react';

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
  icon?: ReactElement;
};

export type PanelProps = {
  position: PanelPosition;
  panelName: PanelName;
  title: string;
};

export type LayoutPanelProps = {
  initialPosition?: PanelPosition;
  component: React.FunctionComponent<PanelProps>;
  icon?: ReactElement;
  title: string;
};

export type PanelPositionProps = {
  active: ReactElement[];
  minimized: MinimizedPanelProps[];
};

export type PanelSettings = Record<PanelName, LayoutPanelProps>;

export enum ApiAction {
  createProject = 'createProject',
  openProject = 'openProject',
  deleteProject = 'deleteProject',
  renameProject = 'renameProject',
  closeProject = 'closeProject',
  putSheet = 'putSheet',
  putAnotherSheet = 'putAnotherSheet',
  openSheet = 'openSheet',
  deleteSheet = 'deleteSheet',
  renameSheet = 'renameSheet',
  closeSheet = 'closeSheet',
  panelInputsMetadata = 'panelInputsMetadata',
}

export type ModalRefFunction = () => void;
export type RenameModalRefFunction = (name: string) => void;

export type CachedViewport = {
  startRow: number;
  endRow: number;
  fields?: Set<string>;
};
