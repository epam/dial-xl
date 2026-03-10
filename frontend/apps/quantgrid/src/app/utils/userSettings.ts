import { AppTheme, zoomValues } from '@frontend/common';

import { PanelInfo, PanelName } from '../common';

type ZoomValue = (typeof zoomValues)[number];
export const defaultZoom: ZoomValue = 1;
export type ChatWindowPlacement = 'panel' | 'floating';
export const ChatWindowPlacements = ['panel', 'floating'] as const;
export const settingsSchemaVersion = 1 as const;

export enum ChartPanelCollapseSection {
  Title = 'title',
  ChartType = 'chartType',
  Selectors = 'selectors',
  SizeLocation = 'sizeLocation',
  Series = 'series',
  Data = 'data',
  XAxis = 'xAxis',
  Orientation = 'orientation',
}

export const defaultChartPanelSections: ChartPanelCollapseSection[] = [
  ChartPanelCollapseSection.Title,
  ChartPanelCollapseSection.ChartType,
];

export enum TableDetailsCollapseSection {
  Name = 'name',
  Location = 'location',
  Orientation = 'orientation',
  Headers = 'headers',
  Columns = 'columns',
}

export const defaultTableDetailsSections: TableDetailsCollapseSection[] = [
  TableDetailsCollapseSection.Name,
];

export enum ProjectPanelCollapseSection {
  ProjectTree = 'project',
  Hints = 'hints',
  Inputs = 'inputs',
  Conversations = 'conversations',
  Questions = 'questions',
}

export const defaultProjectPanelSections: ProjectPanelCollapseSection[] = [
  ProjectPanelCollapseSection.ProjectTree,
  ProjectPanelCollapseSection.Conversations,
  ProjectPanelCollapseSection.Hints,
  ProjectPanelCollapseSection.Inputs,
];

export type UserSettings = {
  appTheme: AppTheme;
  showHiddenFiles: boolean;
  logoSrc: string;
  zoom: ZoomValue;
  chatWindowPlacement: ChatWindowPlacement;

  chartOptionsCollapseSections: ChartPanelCollapseSection[];
  projectPanelActiveKeys: ProjectPanelCollapseSection[];
  tableDetailsCollapseSections: TableDetailsCollapseSection[];

  panelsLayout: Record<PanelName, PanelInfo>;

  bottomBarHeight: number;
  leftBarSize: number;
  rightBarSize: number;

  splitPanelsEnabled: boolean;
  collapsedBarTextHidden: boolean;

  showGridLines: boolean;
};

export type UserSettingsV1 = {
  schemaVersion: 1;
  settings: UserSettings;
};

export function getDefaultUserSettings(): UserSettings {
  const panelsLayout =
    typeof window !== 'undefined' &&
    (window as any).externalEnv?.defaultPanelsSettings
      ? (window as any).externalEnv.defaultPanelsSettings
      : ({} as Record<PanelName, PanelInfo>);

  const defaultEnvLeftPanelSize = window.externalEnv.defaultLeftPanelSize;
  const defaultEnvRightPanelSize = window.externalEnv.defaultRightPanelSize;

  return {
    appTheme: AppTheme.ThemeLight,
    showHiddenFiles: false,
    logoSrc: '',
    zoom: defaultZoom,
    chatWindowPlacement: 'panel',

    chartOptionsCollapseSections: defaultChartPanelSections,
    projectPanelActiveKeys: defaultProjectPanelSections,
    tableDetailsCollapseSections: defaultTableDetailsSections,

    bottomBarHeight: 300,
    leftBarSize: defaultEnvLeftPanelSize ?? 550,
    rightBarSize: defaultEnvRightPanelSize ?? 550,

    panelsLayout,

    splitPanelsEnabled: false,
    collapsedBarTextHidden: false,

    showGridLines: true,
  };
}

export function makeDefaultSettings(): UserSettingsV1 {
  return {
    schemaVersion: settingsSchemaVersion,
    settings: getDefaultUserSettings(),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function coerceUserSettings(raw: unknown): UserSettings {
  const s = isObject(raw) ? raw : {};
  const defaultUserSettings = getDefaultUserSettings();

  return {
    ...defaultUserSettings,
    appTheme:
      typeof s.appTheme === 'string' &&
      Object.values(AppTheme).includes(s.appTheme as AppTheme)
        ? (s.appTheme as AppTheme)
        : defaultUserSettings.appTheme,
    showHiddenFiles:
      typeof s.showHiddenFiles === 'boolean'
        ? s.showHiddenFiles
        : defaultUserSettings.showHiddenFiles,
    logoSrc:
      typeof s.logoSrc === 'string' ? s.logoSrc : defaultUserSettings.logoSrc,
    zoom: typeof s.zoom === 'number' ? s.zoom : defaultUserSettings.zoom,
    chartOptionsCollapseSections: Array.isArray(s.chartOptionsCollapseSections)
      ? (s.chartOptionsCollapseSections.filter(
          (x) => typeof x === 'string',
        ) as ChartPanelCollapseSection[])
      : [],
    projectPanelActiveKeys: Array.isArray(s.projectPanelActiveKeys)
      ? (s.projectPanelActiveKeys.filter(
          (x) => typeof x === 'string',
        ) as ProjectPanelCollapseSection[])
      : [],
    tableDetailsCollapseSections: Array.isArray(s.tableDetailsCollapseSections)
      ? (s.tableDetailsCollapseSections.filter(
          (x) => typeof x === 'string',
        ) as TableDetailsCollapseSection[])
      : [],
    bottomBarHeight:
      typeof s.bottomBarHeight === 'number'
        ? s.bottomBarHeight
        : defaultUserSettings.bottomBarHeight,
    splitPanelsEnabled:
      typeof s.splitPanelsEnabled === 'boolean'
        ? s.splitPanelsEnabled
        : defaultUserSettings.splitPanelsEnabled,
    collapsedBarTextHidden:
      typeof s.collapsedBarTextHidden === 'boolean'
        ? s.collapsedBarTextHidden
        : defaultUserSettings.collapsedBarTextHidden,
    panelsLayout: isObject(s.panelsLayout)
      ? (s.panelsLayout as Record<string, any>)
      : {},
    leftBarSize:
      typeof s.leftBarSize === 'number'
        ? s.leftBarSize
        : defaultUserSettings.leftBarSize,
    rightBarSize:
      typeof s.rightBarSize === 'number'
        ? s.rightBarSize
        : defaultUserSettings.rightBarSize,
    chatWindowPlacement:
      typeof s.chatWindowPlacement === 'string' &&
      Object.values(ChatWindowPlacements).includes(
        s.chatWindowPlacement as ChatWindowPlacement,
      )
        ? (s.chatWindowPlacement as ChatWindowPlacement)
        : defaultUserSettings.chatWindowPlacement,
    showGridLines:
      typeof s.showGridLines === 'boolean'
        ? s.showGridLines
        : defaultUserSettings.showGridLines,
  };
}

export function parseAndMigrateSettings(jsonText: string): UserSettingsV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return makeDefaultSettings();
  }

  if (!isObject(parsed)) return makeDefaultSettings();

  const version = parsed.schemaVersion;

  if (version === 1) {
    const rawSettings = (parsed as any).settings;

    return {
      schemaVersion: settingsSchemaVersion,
      settings: coerceUserSettings(rawSettings),
    };
  }

  const rawSettings = (parsed as any).settings;

  return {
    schemaVersion: settingsSchemaVersion,
    settings: coerceUserSettings(rawSettings),
  };
}
