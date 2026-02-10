import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

import {
  appMessages,
  CompilationError,
  FieldInfo,
  IndexError,
  parseSSEResponse,
  ParsingError,
  ProjectState,
  Viewport,
  ViewportResponse,
} from '@frontend/common';
import { ParsedSheet } from '@frontend/parser';

import { ViewportContext } from '../../context';
import { uniqueId } from '../../services';
import { constructPath, displayToast, encodeApiUrl } from '../../utils';
import { addChartFiltersToDefaultViewportRequest } from '../Charts';
import { useApiRequests } from '../useApiRequests';
import { LongCalcAction, LongCalcRequestType } from './useLongCalculations';

type Props = {
  _projectState: MutableRefObject<ProjectState | null>;
  parsedSheet: ParsedSheet | null;
  currentSheetName: string | null;
  hasEditPermissions: boolean;
  setIndexErrors: Dispatch<SetStateAction<IndexError[] | null>>;
  setCurrentSheetParsingErrors: Dispatch<SetStateAction<ParsingError[]>>;
  setCurrentSheetCompilationErrors: Dispatch<
    SetStateAction<CompilationError[]>
  >;
  manageRequestLifecycle: (
    action: LongCalcAction,
    reqType: LongCalcRequestType,
    controller?: AbortController
  ) => void;
};

export function useViewportRequests({
  _projectState,
  currentSheetName,
  setIndexErrors,
  hasEditPermissions,
  parsedSheet,
  manageRequestLifecycle,
  setCurrentSheetParsingErrors,
  setCurrentSheetCompilationErrors,
}: Props) {
  const {
    viewGridData,
    onColumnDataResponse,
    onProfileResponse,
    onIndexResponse,
  } = useContext(ViewportContext);
  const { getViewport: getViewportRequest } = useApiRequests();

  const [fieldInfos, setFieldInfos] = useState<FieldInfo[]>([]);

  /**
   * Method similar to getCurrentProjectViewport but it allows to add virtual tables DSL to the current sheet content.
   * Also, it doesn't update the current sheet errors and compilation results.
   * Currently used to get selector (keys) values for charts.
   */
  const getVirtualProjectViewport = useCallback(
    async (viewports: Viewport[], virtualTablesDSL: string[]) => {
      if (!_projectState.current) return;

      const requestId = uniqueId();
      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        if (curr.sheetName === currentSheetName) {
          acc[curr.sheetName] =
            curr.content + '\n' + virtualTablesDSL.join('\n');
        } else {
          acc[curr.sheetName] = curr.content;
        }

        return acc;
      }, {} as Record<string, string>);

      const controller = new AbortController();
      manageRequestLifecycle('start', 'viewport', controller);

      const res = await getViewportRequest({
        projectPath: encodeApiUrl(
          constructPath([
            'files',
            _projectState.current.bucket,
            _projectState.current.path,
            _projectState.current.projectName,
          ])
        ),
        viewports,
        worksheets,
        hasEditPermissions,
        controller,
        includeCompilation: false,
      });

      if (!res) {
        manageRequestLifecycle('end', 'viewport', controller);

        return;
      }

      try {
        await parseSSEResponse(
          res,
          {
            onData: (parsedData: Partial<ViewportResponse>) => {
              if (parsedData.columnData) {
                onColumnDataResponse(parsedData.columnData);
              }

              if (parsedData.profile) {
                onProfileResponse(requestId, parsedData.profile);
              }

              if (parsedData.index) {
                onIndexResponse(parsedData.index);
              }
            },
          },
          controller
        );
      } catch (error) {
        // Ignore abort errors
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          displayToast('error', appMessages.calculateError);
        }
      } finally {
        manageRequestLifecycle('end', 'viewport', controller);
      }
    },
    [
      _projectState,
      currentSheetName,
      getViewportRequest,
      onColumnDataResponse,
      onProfileResponse,
      onIndexResponse,
      hasEditPermissions,
      manageRequestLifecycle,
    ]
  );

  const getCurrentProjectViewport = useCallback(
    async ({
      viewports,
      overrideCurrentSheetContent,
      withCompilation,
    }: {
      viewports: Viewport[];
      overrideCurrentSheetContent?: string;
      withCompilation: boolean;
    }) => {
      if (!_projectState.current) return;

      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        acc[curr.sheetName] = curr.content;

        if (
          curr.sheetName === currentSheetName &&
          overrideCurrentSheetContent
        ) {
          acc[curr.sheetName] = overrideCurrentSheetContent;
        } else if (
          curr.sheetName === currentSheetName &&
          parsedSheet?.editableSheet &&
          !overrideCurrentSheetContent
        ) {
          acc[curr.sheetName] = addChartFiltersToDefaultViewportRequest(
            parsedSheet.clone().editableSheet,
            viewports,
            viewGridData,
            acc[curr.sheetName]
          );
        }

        return acc;
      }, {} as Record<string, string>);

      const requestId = uniqueId();
      viewGridData.startRequest(requestId);

      const controller = new AbortController();
      manageRequestLifecycle('start', 'viewport', controller);

      const res = await getViewportRequest({
        projectPath: encodeApiUrl(
          constructPath([
            'files',
            _projectState.current.bucket,
            _projectState.current.path,
            _projectState.current.projectName,
          ])
        ),
        viewports,
        worksheets,
        hasEditPermissions,
        controller,
        includeCompilation: withCompilation,
      });

      if (!res) {
        manageRequestLifecycle('end', 'viewport', controller);
        viewGridData.finishRequest(requestId);

        return;
      }

      try {
        await parseSSEResponse(
          res,
          {
            onData: (parsedData: Partial<ViewportResponse>) => {
              if (parsedData.columnData) {
                onColumnDataResponse(parsedData.columnData);
              }

              if (parsedData.profile) {
                onProfileResponse(requestId, parsedData.profile);
              }

              if (parsedData.index) {
                onIndexResponse(parsedData.index);
                setIndexErrors(viewGridData.getIndexErrors());
              }

              if (parsedData.compileResult) {
                viewGridData.saveHashData(parsedData.compileResult.fieldInfo);

                if (parsedData.compileResult.compilationErrors) {
                  viewGridData.setCompilationErrors(
                    parsedData.compileResult.compilationErrors
                  );
                  setCurrentSheetCompilationErrors(
                    parsedData.compileResult.compilationErrors
                  );
                }

                setFieldInfos(parsedData.compileResult.fieldInfo ?? []);

                const sheetErrors: ParsingError[] = [];
                parsedData.compileResult.sheets?.forEach((sheet) => {
                  sheetErrors.push(
                    ...sheet.parsingErrors.map((error) => ({
                      ...error,
                      source: {
                        ...error.source,
                        sheet: sheet.name || '',
                      },
                    }))
                  );

                  if (sheet.name === currentSheetName) {
                    viewGridData.setParsingErrors(sheet.parsingErrors);

                    return;
                  }
                });
                setCurrentSheetParsingErrors(sheetErrors);
              }
            },
          },
          controller
        );
      } catch (error) {
        // Ignore abort errors
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          displayToast('error', appMessages.calculateError);
        }
      } finally {
        viewGridData.finishRequest(requestId);

        if (withCompilation) {
          viewGridData.syncHashes();
        }
        manageRequestLifecycle('end', 'viewport', controller);
      }
    },
    [
      _projectState,
      viewGridData,
      manageRequestLifecycle,
      getViewportRequest,
      hasEditPermissions,
      currentSheetName,
      parsedSheet,
      onColumnDataResponse,
      onProfileResponse,
      onIndexResponse,
      setIndexErrors,
      setCurrentSheetCompilationErrors,
      setCurrentSheetParsingErrors,
    ]
  );

  return {
    getCurrentProjectViewport,
    getVirtualProjectViewport,
    fieldInfos,
  };
}
