import {
  ChangeNameKind,
  ChangeNameUIOverrides,
  ModalUIProps,
} from '../../../store';

export const modalUIConfig: Record<ChangeNameKind, ModalUIProps> = {
  renameProject: {
    title: 'Rename Project',
    label: 'Project name after renaming',
    placeholder: 'Project name',
    okText: 'OK',
    inputId: 'projectName',
    enableSameNameCheck: true,
  },
  renameSheet: {
    title: 'Rename Worksheet',
    label: 'Worksheet name after renaming',
    placeholder: 'Sheet name',
    okText: 'OK',
    inputId: 'sheetName',
    enableSameNameCheck: true,
  },
  renameConversation: {
    title: 'Rename Conversation',
    label: 'Conversation name after renaming',
    placeholder: 'Conversation name',
    okText: 'OK',
    inputId: 'conversationName',
    enableSameNameCheck: true,
  },
  cloneProject: {
    title: 'Clone Project',
    label: 'New project name',
    placeholder: 'Project name',
    okText: 'OK',
    inputId: 'projectCloneName',
    enableSameNameCheck: false,
  },
  createSheet: {
    title: 'Create Worksheet',
    label: 'New worksheet name',
    placeholder: 'Sheet name',
    okText: 'OK',
    inputId: 'sheetCreateName',
    enableSameNameCheck: false,
  },
  createFolder: {
    title: 'New Folder',
    label: 'New folder name',
    placeholder: 'Folder name',
    okText: 'OK',
    inputId: 'folderCreateName',
    enableSameNameCheck: true,
  },
};

export function buildChangeNameUi(
  kind: ChangeNameKind,
  overrides?: ChangeNameUIOverrides,
): ModalUIProps {
  const base = modalUIConfig[kind];

  return { ...base, ...overrides };
}
