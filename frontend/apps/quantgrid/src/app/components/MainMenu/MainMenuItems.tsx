import { ItemType } from 'antd/es/menu/interface';

import Icon from '@ant-design/icons';
import {
  AdjustmentsIcon,
  chartItems,
  ColumnsIcon,
  DialChatLogoIcon,
  EditIcon,
  ExclamationCircleIcon,
  FileIcon,
  FilesMetadata,
  FormulasContextMenuKeyData,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getTableBySizeDropdownItem,
  GridCell,
  HintStarIcon,
  HistoryIcon,
  InsertChartContextMenuKeyData,
  InsertIcon,
  ListTreeIcon,
  MenuItem,
  QGLogo,
  QuestionIcon,
  Shortcut,
  shortcutApi,
  TagIcon,
  TypographyIcon,
  TypographyOffIcon,
  ViewIcon,
  ViewportNarrowIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { PanelName } from '../../common';
import { RecentProject } from '../../services';

export const togglePanelKeys: Record<string, PanelName> = {
  ToggleProjectTree: PanelName.ProjectTree,
  ToggleInputs: PanelName.Inputs,
  ToggleCodeEditor: PanelName.CodeEditor,
  ToggleErrorPanel: PanelName.Errors,
  ToggleHistoryPanel: PanelName.UndoRedo,
  ToggleAIHints: PanelName.AIHints,
  ToggleChartPanel: PanelName.Details,
};

export const fileMenuKeys = {
  createProject: 'CreateProject',
  deleteProject: 'DeleteProject',
  closeProject: 'CloseProject',
  shareProject: 'Share project',
  cloneProject: 'CloneProject',
  downloadProject: 'DownloadProject',
  createWorksheet: 'CreateWorksheet',
  clearProjectHistory: 'Clear project history',
  openProject: 'OpenProject',
  viewAllProjects: 'ViewAllProjects',
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
  togglePanelLabels: 'TogglePanelLabels',
  toggleSplitPanels: 'ToggleSplitPanels',
  ToggleChatPlacement: 'ToggleChatPlacement',
  resetSheetColumns: 'Reset spreadsheet columns',
};

export const insertMenuKeys = {
  table: 'Table',
  chart: 'Chart',
  newField: 'NewField',
  insertLeft: 'InsertLeft',
  insertRight: 'InsertRight',
  newRow: 'NewRow',
  newRowAbove: 'NewRowAbove',
  newRowBelow: 'NewRowBelow',
};

export const helpMenuKeys = {
  shortcuts: 'Shortcuts',
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

export const getCreateChartChildren = () => {
  return [
    ...chartItems.map((item) => {
      return getDropdownItem({
        label: item.label,
        key: getDropdownMenuKey<InsertChartContextMenuKeyData>('insertChart', {
          chartType: item.type,
        }),
        icon: (
          <Icon
            className="text-textSecondary w-[18px]"
            component={() => item.icon}
          />
        ),
      });
    }),
  ];
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
  recentProjects,
  panelsSplitEnabled,
  collapsedPanelsTextHidden,
  onCreateTable,
}: {
  selectedCell: GridCell | null | undefined;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: FilesMetadata[] | null;
  isYourProject: boolean;
  isAIPendingChanges: boolean;
  recentProjects: RecentProject[];
  panelsSplitEnabled: boolean;
  collapsedPanelsTextHidden: boolean;
  onCreateTable: (cols: number, rows: number) => void;
}) {
  return [
    {
      label: 'File',
      key: 'FileMenu',
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <FileIcon />}
        />
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
        getDropdownItem({
          label: 'Open project',
          key: 'OpenProjectParent',
          children: [
            ...recentProjects.map((recentProject) =>
              getDropdownItem({
                label: (
                  <div className="flex items-center truncate gap-2">
                    <Icon className="w-[18px]" component={() => <QGLogo />} />
                    {recentProject.projectName}
                  </div>
                ),
                key: getDropdownMenuKey(
                  fileMenuKeys.openProject,
                  recentProject
                ),
              })
            ),
            recentProjects.length ? getDropdownDivider() : undefined,
            getDropdownItem({
              label: 'View all projects',
              key: fileMenuKeys.viewAllProjects,
            }),
          ].filter(Boolean) as ItemType[],
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
        getDropdownItem({
          label: 'Clone project',
          key: fileMenuKeys.cloneProject,
        }),
        getDropdownItem({
          label: 'Download project',
          key: fileMenuKeys.downloadProject,
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
          className="w-[18px] text-textSecondary"
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
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <ViewIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Panels',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <ViewIcon />}
            />
          ),
          key: 'PanelMenu',
          children: [
            getDropdownItem({
              label: 'Toggle Project Tree',
              key: 'ToggleProjectTree',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleProjects),
              icon: (
                <Icon
                  className="text-textAccentPrimary w-[18px]"
                  component={() => <ListTreeIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle Code Editor',
              key: 'ToggleCodeEditor',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleCodeEditor),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <TagIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle Inputs',
              key: 'ToggleInputs',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleInputs),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <FileIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle Error Panel',
              key: 'ToggleErrorPanel',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleErrors),
              icon: (
                <Icon
                  className="text-textError w-[18px]"
                  component={() => <ExclamationCircleIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle History Panel',
              key: 'ToggleHistoryPanel',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleHistory),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <HistoryIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle Chat',
              key: 'ToggleChat',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleChat),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <DialChatLogoIcon />}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle AI Hints',
              key: 'ToggleAIHints',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleAIHints),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => (
                    <HintStarIcon secondaryAccentCssVar="text-accent-tertiary" />
                  )}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle details',
              key: 'ToggleChartPanel',
              shortcut: shortcutApi.getLabel(Shortcut.ToggleChart),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <AdjustmentsIcon />}
                />
              ),
            }),
          ],
        }),
        getDropdownItem({
          label: collapsedPanelsTextHidden ? 'Show labels' : 'Hide labels',
          key: viewMenuKeys.togglePanelLabels,
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() =>
                collapsedPanelsTextHidden ? (
                  <TypographyIcon />
                ) : (
                  <TypographyOffIcon />
                )
              }
            />
          ),
        }),
        getDropdownItem({
          label: panelsSplitEnabled ? 'Merge panels' : 'Split panels',
          key: viewMenuKeys.toggleSplitPanels,
          icon: (
            <Icon
              className="text-textSecondary w-[18px] rotate-90"
              component={() => <ColumnsIcon />}
            />
          ),
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Reset spreadsheet columns',
          key: viewMenuKeys.resetSheetColumns,
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => (
                <ViewportNarrowIcon secondaryAccentCssVar="text-accent-primary" />
              )}
            />
          ),
        }),
        getDropdownItem({
          label: 'Toggle Chat Placement',
          key: 'ToggleChatPlacement',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <DialChatLogoIcon />}
            />
          ),
        }),
      ],
    },

    {
      label: 'Insert',
      key: 'InsertMenu',
      icon: (
        <Icon
          className="w-4 text-textSecondary"
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
        getDropdownItem({
          label: 'Chart',
          key: insertMenuKeys.chart,
          children: getCreateChartChildren() as MenuItem[],
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'New column',
          key: insertMenuKeys.newField,
          disabled: !selectedCell?.table?.tableName,
          tooltip: !selectedCell?.table?.tableName
            ? 'No table selected'
            : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Column above'
            : 'Column to the left',
          key: insertMenuKeys.insertLeft,
          disabled: !selectedCell?.field?.fieldName,
          tooltip: !selectedCell?.field ? 'No column cell selected' : undefined,
        }),
        getDropdownItem({
          label: selectedCell?.table?.isTableHorizontal
            ? 'Column below'
            : 'Column to the right',
          key: insertMenuKeys.insertRight,
          disabled: !selectedCell?.field?.fieldName,
          tooltip: !selectedCell?.field ? 'No column cell selected' : undefined,
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
          className="text-textSecondary w-[18px]"
          component={() => <QuestionIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Keyboard Shortcuts',
          key: helpMenuKeys.shortcuts,
        }),
      ],
    },
  ];
}
