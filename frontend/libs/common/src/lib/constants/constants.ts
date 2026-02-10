import { AppTheme } from '../types';

export const formulaEditorId = 'formulaEditor';
export const formulaBarInput = 'formulaBarInput';
export const codeEditorId = 'codeEditorId';
export const projectTreeId = 'projectTree';
export const projectPanelWrapperId = 'projectPanelWrapper';
export const projectPanelSectionHeaderClass = 'project-panel-section-header';
export const conversationsTreeId = 'conversationsTree';
export const overrideKeyFieldMessage =
  'Override of the key column is not supported.';
export const makeKeyFieldWithOverridesMessage =
  'Making a column a key column when it has overrides is not supported.';
export const overrideFilteredOrSortedFieldMessage =
  'Changing sort/filter columns are not allowed for table without key. Please assign keys.';

export const firstRowNum = 1;
export const defaultFieldName = 'Column1';
export const defaultFolderName = 'New folder';

export const formulaBarMenuClass = 'formula-bar-menu';

export const filesEndpointType = 'files';
export const conversationsEndpointType = 'conversations';
export const deploymentsEndpointType = 'deployments';

export const filesEndpointPrefix = `/v1/${filesEndpointType}`;
export const conversationsEndpointPrefix = `/v1/${conversationsEndpointType}`;
export const deploymentsEndpointPrefix = `/v1/${deploymentsEndpointType}`;

export const defaultSheetName = 'Sheet1';
export const defaultProjectName = 'Project1';
export const defaultTableName = 'Table1';
export const defaultChartName = 'Chart1';

export const dialProjectFileExtension = '.qg';
export const dialAIHintsFileName = '.hints.ai';
export const csvFileExtension = '.csv';
export const schemaFileExtension = '.schema';
export const emptyFileName = '.file';
export const projectMetadataSettingsKey = 'projectMetadata';
export const forkedProjectMetadataKey = 'forkedFrom';

export const projectFolderAppdata = 'appdata';
export const projectFolderXl = 'xl';
export const projectFoldersRootPrefix =
  projectFolderAppdata + '/' + projectFolderXl;
export const csvTempFolder = '.temp';

export const bindConversationsRootFolder = 'xl';
export const bindConversationsSharedRootFolder = 'shared-xl';

export const publicBucket = 'public';
export const publicExamplesFolderRootPrefix = 'xl-examples';

export const defaultChartCols = 10;
export const defaultChartRows = 15;

export const chartRowNumberSelector = 'rowNumber';
export const histogramChartSeriesSelector = 'histogramSeries';

export const zoomValues = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const defaultTheme: AppTheme = AppTheme.ThemeLight;
