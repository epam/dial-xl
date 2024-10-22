import Icon from '@ant-design/icons';
import {
  EditIcon,
  FileIcon,
  FilesMetadata,
  FormulasContextMenuKeyData,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getTableBySizeDropdownItem,
  GridCell,
  InsertIcon,
  MenuItem,
  QuestionIcon,
  Shortcut,
  shortcutApi,
  ViewIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { PanelName } from '../../common';

export const togglePanelKeys: Record<string, PanelName> = {
  ToggleProjectTree: PanelName.ProjectTree,
  ToggleInputs: PanelName.Inputs,
  ToggleCodeEditor: PanelName.CodeEditor,
  ToggleErrorPanel: PanelName.Errors,
  ToggleHistoryPanel: PanelName.UndoRedo,
};

export const fileMenuKeys = {
  createProject: 'CreateProject',
  deleteProject: 'DeleteProject',
  closeProject: 'CloseProject',
  shareProject: 'Share project',
  createWorksheet: 'CreateWorksheet',
  clearProjectHistory: 'Clear project history',
};

export const editMenuKeys = {
  undo: 'Undo',
  redo: 'Redo',
  search: 'Search',
  deleteWorksheet: 'DeleteWorksheet',
  renameWorksheet: 'RenameWorksheet',
  renameProject: 'RenameProject',
};

export const viewMenuKeys = {
  toggleChat: 'ToggleChat',
  ToggleChatPlacement: 'ToggleChatPlacement',
  resetSheetColumns: 'Reset spreadsheet columns',
};

export const insertMenuKeys = {
  table: 'Table',
  newField: 'NewField',
  insertLeft: 'InsertLeft',
  insertRight: 'InsertRight',
  newRow: 'NewRow',
  newRowAbove: 'NewRowAbove',
  newRowBelow: 'NewRowBelow',
};

export const helpMenuKeys = {
  shortcuts: 'Shortcuts',
  toggleGrid: 'Toggle grid',
};

const createTableMenuKeys = {
  byRowRange: 'byRowRange',
  bySize: 'bySize',
  copy: 'copy',
  derived: 'derived',
  input: 'input',
  filter: 'filter',
  sortTable: 'sortTable',
  uniqueValues: 'uniqueValues',
};

export const getCreateTableChildren = (
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  inputFiles: FilesMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void
) => {
  const inputs = [...(inputFiles ?? [])].sort((a, b) =>
    a.name < b.name ? -1 : 1
  );

  const rangeFunction = functions.find((func) => func.name === 'RANGE');
  const filterFunction = functions.find((func) => func.name === 'FILTER');
  const sortByFunction = functions.find((func) => func.name === 'SORTBY');
  const uniqueByFunction = functions.find((func) => func.name === 'UNIQUEBY');

  let tableNames: string[] = [];
  for (const sheet of Object.values(parsedSheets)) {
    tableNames = tableNames.concat(
      [...sheet.tables.map((table) => table.tableName)].sort()
    );
  }

  return [
    getDropdownItem({
      label: 'By row range',
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        [
          'CreateTable',
          createTableMenuKeys.byRowRange,
          rangeFunction?.name,
        ].join('-'),
        {
          insertFormula: rangeFunction?.name + '()',
        }
      ),
    }),
    getDropdownItem({
      label: 'By size',
      key: createTableMenuKeys.bySize,
      children: [
        getTableBySizeDropdownItem({
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', createTableMenuKeys.bySize].join('-'),
            {
              type: 'size',
            }
          ),
          onCreateTable,
        }),
      ],
    }),
    getDropdownItem({
      label: 'Copy',
      key: 'Copy',
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Copy', name].join('-'),
            {
              tableName: name,
              type: 'copy',
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Derived',
      key: getDropdownMenuKey(createTableMenuKeys.derived),
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Derived', name].join('-'),
            {
              tableName: name,
              type: 'derived',
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Input',
      key: getDropdownMenuKey(createTableMenuKeys.input),
      disabled: !inputs?.length,
      children: inputs?.map(({ name, url }) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Derived', name].join('-'),
            {
              insertFormula: `INPUT("${url ?? name}")`,
            }
          ),
        })
      ),
    }),
    filterFunction
      ? getDropdownItem({
          label: 'Filter',
          key: getDropdownMenuKey(createTableMenuKeys.filter),
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: filterFunction.name + `(${name},)`,
                }
              ),
            })
          ),
        })
      : undefined,
    sortByFunction
      ? getDropdownItem({
          label: 'Sort table',
          key: getDropdownMenuKey(createTableMenuKeys.sortTable),
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: sortByFunction.name + `(${name},)`,
                }
              ),
            })
          ),
        })
      : undefined,
    uniqueByFunction
      ? getDropdownItem({
          label: 'Unique values',
          key: getDropdownMenuKey(createTableMenuKeys.uniqueValues),
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: uniqueByFunction.name + `(${name},)`,
                }
              ),
            })
          ),
        })
      : undefined,
  ];
};

export function getMenuItems({
  selectedCell,
  functions,
  parsedSheets,
  inputFiles,
  isYourProject,
  isAIPendingChanges,
  onCreateTable,
}: {
  selectedCell: GridCell | null | undefined;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: FilesMetadata[] | null;
  isYourProject: boolean;
  isAIPendingChanges: boolean;
  onCreateTable: (cols: number, rows: number) => void;
}) {
  return [
    {
      label: 'File',
      key: 'FileMenu',
      icon: (
        <Icon className="stroke-textSecondary" component={() => <FileIcon />} />
      ),
      children: [
        getDropdownItem({
          label: 'Create project',
          key: fileMenuKeys.createProject,
          shortcut: shortcutApi.getLabel(Shortcut.NewProject),
        }),
        getDropdownItem({
          label: 'Create worksheet',
          key: fileMenuKeys.createWorksheet,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Clear project history',
          key: fileMenuKeys.clearProjectHistory,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Delete project',
          key: fileMenuKeys.deleteProject,
          disabled: !isYourProject,
          tooltip: !isYourProject
            ? 'You are not allowed to delete projects which are not yours'
            : undefined,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Share project',
          key: fileMenuKeys.shareProject,
          disabled: !isYourProject,
          tooltip: !isYourProject
            ? 'You are not allowed to share projects which are not yours'
            : undefined,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Back to projects',
          key: fileMenuKeys.closeProject,
        }),
      ],
    },

    {
      label: 'Edit',
      key: 'EditMenu',
      icon: (
        <Icon
          className="w-[18px] text-textSecondary stroke-textSecondary"
          component={() => <EditIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Undo',
          key: editMenuKeys.undo,
          shortcut: shortcutApi.getLabel(Shortcut.UndoAction),
          disabled: isAIPendingChanges,
          tooltip: isAIPendingChanges
            ? 'Please accept or discard pending AI change before continue working with project'
            : undefined,
        }),
        getDropdownItem({
          label: 'Redo',
          key: editMenuKeys.redo,
          shortcut: shortcutApi.getLabel(Shortcut.RedoAction),
          disabled: isAIPendingChanges,
          tooltip: isAIPendingChanges
            ? 'Please accept or discard pending AI change before continue working with project'
            : undefined,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Search',
          key: editMenuKeys.search,
          shortcut: shortcutApi.getLabel(Shortcut.SearchWindow),
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Rename Project',
          key: editMenuKeys.renameProject,
          disabled: !isYourProject,
          tooltip: !isYourProject
            ? 'You are not allowed to rename projects which are not yours'
            : undefined,
        }),
        getDropdownItem({
          label: 'Rename Worksheet',
          key: editMenuKeys.renameWorksheet,
        }),
        getDropdownItem({
          label: 'Delete Worksheet',
          key: editMenuKeys.deleteWorksheet,
        }),
      ],
    },

    {
      label: 'View',
      key: 'ViewMenu',
      icon: (
        <Icon className="stroke-textSecondary" component={() => <ViewIcon />} />
      ),
      children: [
        getDropdownItem({
          label: 'Panels',
          key: 'PanelMenu',
          children: [
            getDropdownItem({
              label: 'Toggle Project Tree',
              key: 'ToggleProjectTree',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleProjects),
            }),
            getDropdownItem({
              label: 'Toggle Code Editor',
              key: 'ToggleCodeEditor',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleCodeEditor),
            }),
            getDropdownItem({
              label: 'Toggle Inputs',
              key: 'ToggleInputs',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleInputs),
            }),
            getDropdownItem({
              label: 'Toggle Error Panel',
              key: 'ToggleErrorPanel',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleErrors),
            }),
            getDropdownItem({
              label: 'Toggle History Panel',
              key: 'ToggleHistoryPanel',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleHistory),
            }),
            getDropdownItem({
              label: 'Toggle Chat',
              key: 'ToggleChat',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleChat),
            }),
          ],
        }),
        getDropdownItem({
          label: 'Reset spreadsheet columns',
          key: viewMenuKeys.resetSheetColumns,
        }),
        getDropdownItem({
          label: 'Toggle Chat Placement',
          key: 'ToggleChatPlacement',
        }),
      ],
    },

    {
      label: 'Insert',
      key: 'InsertMenu',
      icon: (
        <Icon
          className="w-4 stroke-textSecondary"
          component={() => <InsertIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Table',
          key: insertMenuKeys.table,
          children: getCreateTableChildren(
            functions,
            parsedSheets,
            inputFiles,
            onCreateTable
          ) as MenuItem[],
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'New field',
          key: insertMenuKeys.newField,
          disabled: !selectedCell?.table?.tableName,
          tooltip: !selectedCell?.table?.tableName
            ? 'No table selected'
            : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Field above'
            : 'Field to the left',
          key: insertMenuKeys.insertLeft,
          disabled: !selectedCell?.field?.fieldName,
          tooltip: !selectedCell?.field ? 'No field cell selected' : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Field below'
            : 'Field to the right',
          key: insertMenuKeys.insertRight,
          disabled: !selectedCell?.field?.fieldName,
          tooltip: !selectedCell?.field ? 'No field cell selected' : undefined,
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'New row',
          key: insertMenuKeys.newRow,
          disabled:
            !selectedCell?.table ||
            (!!selectedCell && !selectedCell?.table?.isManual),
          tooltip: !selectedCell?.table
            ? 'No table selected'
            : selectedCell && !selectedCell?.table?.isManual
            ? 'Only available for manual table'
            : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Row to the left'
            : 'Row above',
          key: insertMenuKeys.newRowAbove,
          disabled:
            selectedCell?.isFieldHeader ||
            selectedCell?.isTableHeader ||
            (!!selectedCell && !selectedCell?.table?.isManual),
          tooltip:
            selectedCell?.isFieldHeader || selectedCell?.isTableHeader
              ? 'No table cell selected'
              : selectedCell && !selectedCell?.table?.isManual
              ? 'Only available for manual table'
              : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Row to the right'
            : 'Row below',
          key: insertMenuKeys.newRowBelow,
          disabled:
            selectedCell?.isFieldHeader ||
            selectedCell?.isTableHeader ||
            (!!selectedCell && !selectedCell?.table?.isManual),
          tooltip:
            selectedCell?.isFieldHeader || selectedCell?.isTableHeader
              ? 'No table cell selected'
              : selectedCell && !selectedCell?.table?.isManual
              ? 'Only available for manual table'
              : undefined,
        }),
      ],
    },

    {
      label: 'Help',
      key: 'HelpMenu',
      icon: (
        <Icon
          className="stroke-textSecondary"
          component={() => <QuestionIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Keyboard Shortcuts',
          key: helpMenuKeys.shortcuts,
        }),
        getDropdownItem({
          label: 'Toggle grid',
          key: helpMenuKeys.toggleGrid,
        }),
      ],
    },
  ];
}
