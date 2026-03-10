import { useCallback, useContext, useMemo, useState } from 'react';

import {
  CompilationError,
  CompileErrorIcon,
  EvaluationError,
  IndexError,
  ParsingError,
  RuntimeError,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { getErrorLocationInfo } from '../../../utils';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { ErrorItem } from './ErrorItem';
import { ErrorPanelTopBar } from './ErrorPanelTopBar';

type ErrorType = 'compile' | 'runtime' | 'index' | 'parsing';

type GroupedErrors = {
  sheetName: string;
  parsingErrors: ParsingError[];
  compilationErrors: CompilationError[];
  runtimeErrors: RuntimeError[];
  indexErrors: IndexError[];
};

export function Errors() {
  const {
    sheetErrors: parsingErrors,
    compilationErrors,
    runtimeErrors,
    indexErrors,
    parsedSheets,
  } = useContext(ProjectContext);

  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [filteredErrorTypes, setFilteredErrorTypes] = useState<Set<ErrorType>>(
    new Set(),
  );

  const getFilteredErrors = useCallback(
    (errors: EvaluationError[] | null, errorType: ErrorType) => {
      if (!errors) return null;

      return !filteredErrorTypes.has(errorType)
        ? selectedSheet
          ? errors.filter((error) => {
              const locationInfo = getErrorLocationInfo(error, parsedSheets);

              return locationInfo?.sheetName === selectedSheet;
            })
          : errors
        : null;
    },
    [filteredErrorTypes, parsedSheets, selectedSheet],
  );

  const filteredParsingErrors = useMemo(() => {
    if (!parsingErrors) return null;

    return getFilteredErrors(parsingErrors, 'parsing') as ParsingError[] | null;
  }, [getFilteredErrors, parsingErrors]);

  const filteredCompilationErrors = useMemo(() => {
    if (!compilationErrors) return null;

    return getFilteredErrors(compilationErrors, 'compile') as
      | CompilationError[]
      | null;
  }, [getFilteredErrors, compilationErrors]);

  const filteredRuntimeErrors = useMemo(() => {
    if (!runtimeErrors) return null;

    return getFilteredErrors(runtimeErrors, 'runtime') as RuntimeError[] | null;
  }, [getFilteredErrors, runtimeErrors]);

  const filteredIndexErrors = useMemo(() => {
    if (!indexErrors) return null;

    return getFilteredErrors(indexErrors, 'index') as IndexError[] | null;
  }, [getFilteredErrors, indexErrors]);

  const groupedErrorsBySheet = useMemo(() => {
    if (selectedSheet) {
      return null;
    }

    const grouped = new Map<string, GroupedErrors>();

    if (filteredParsingErrors) {
      filteredParsingErrors.forEach((error) => {
        const locationInfo = getErrorLocationInfo(error, parsedSheets);
        const sheetName = locationInfo?.sheetName || 'Unknown Sheet';

        if (!grouped.has(sheetName)) {
          grouped.set(sheetName, {
            sheetName,
            parsingErrors: [],
            compilationErrors: [],
            runtimeErrors: [],
            indexErrors: [],
          });
        }
        grouped.get(sheetName)!.parsingErrors.push(error);
      });
    }

    if (filteredCompilationErrors) {
      filteredCompilationErrors.forEach((error) => {
        const locationInfo = getErrorLocationInfo(error, parsedSheets);
        const sheetName = locationInfo?.sheetName || 'Unknown Sheet';

        if (!grouped.has(sheetName)) {
          grouped.set(sheetName, {
            sheetName,
            parsingErrors: [],
            compilationErrors: [],
            runtimeErrors: [],
            indexErrors: [],
          });
        }
        grouped.get(sheetName)!.compilationErrors.push(error);
      });
    }

    if (filteredRuntimeErrors) {
      filteredRuntimeErrors.forEach((error) => {
        const locationInfo = getErrorLocationInfo(error, parsedSheets);
        const sheetName = locationInfo?.sheetName || 'Unknown Sheet';

        if (!grouped.has(sheetName)) {
          grouped.set(sheetName, {
            sheetName,
            parsingErrors: [],
            compilationErrors: [],
            runtimeErrors: [],
            indexErrors: [],
          });
        }
        grouped.get(sheetName)!.runtimeErrors.push(error);
      });
    }

    if (filteredIndexErrors) {
      filteredIndexErrors.forEach((error) => {
        const locationInfo = getErrorLocationInfo(error, parsedSheets);
        const sheetName = locationInfo?.sheetName || 'Unknown Sheet';

        if (!grouped.has(sheetName)) {
          grouped.set(sheetName, {
            sheetName,
            parsingErrors: [],
            compilationErrors: [],
            runtimeErrors: [],
            indexErrors: [],
          });
        }
        grouped.get(sheetName)!.indexErrors.push(error);
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.sheetName.localeCompare(b.sheetName),
    );
  }, [
    selectedSheet,
    filteredParsingErrors,
    filteredCompilationErrors,
    filteredRuntimeErrors,
    filteredIndexErrors,
    parsedSheets,
  ]);

  const hasFilteredErrors = [
    filteredParsingErrors,
    filteredCompilationErrors,
    filteredRuntimeErrors,
    filteredIndexErrors,
  ].some((e) => e && e?.length > 0);

  const handleToggleErrorType = useCallback((errorType: ErrorType) => {
    setFilteredErrorTypes((prev) => {
      const next = new Set(prev);

      if (next.has(errorType)) {
        next.delete(errorType);
      } else {
        next.add(errorType);
      }

      return next;
    });
  }, []);

  return (
    <div className="@container flex flex-col w-full bg-bg-layer-3 overflow-hidden h-full">
      <ErrorPanelTopBar
        compilationErrors={compilationErrors}
        filteredErrorTypes={filteredErrorTypes}
        indexErrors={indexErrors}
        parsingErrors={parsingErrors}
        runtimeErrors={runtimeErrors}
        selectedSheet={selectedSheet}
        onSheetChange={setSelectedSheet}
        onToggleErrorType={handleToggleErrorType}
      />
      <div className="flex flex-col grow overflow-auto px-1 thin-scrollbar">
        {!hasFilteredErrors ? (
          <PanelEmptyMessage
            icon={<CompileErrorIcon />}
            message="No errors match the current filters"
          />
        ) : groupedErrorsBySheet ? (
          groupedErrorsBySheet.map((group) => {
            const hasErrorsInGroup =
              group.parsingErrors.length > 0 ||
              group.compilationErrors.length > 0 ||
              group.runtimeErrors.length > 0 ||
              group.indexErrors.length > 0;

            if (!hasErrorsInGroup) return null;

            return (
              <div className="mb-3" key={group.sheetName}>
                <div className="text-[12px] font-semibold text-text-secondary px-1 sticky top-0 bg-bg-layer-3 py-1">
                  {group.sheetName}
                </div>
                <div className="space-y-1">
                  {group.parsingErrors.map((error, index) => (
                    <ErrorItem
                      error={error}
                      errorType={'parsing'}
                      key={`${'parsing'}-${index}`}
                    />
                  ))}
                  {group.compilationErrors.map((error, index) => (
                    <ErrorItem
                      error={error}
                      errorType={'compile'}
                      key={`${'compile'}-${index}`}
                    />
                  ))}
                  {group.runtimeErrors.map((error, index) => (
                    <ErrorItem
                      error={error}
                      errorType={'runtime'}
                      key={`${'runtime'}-${index}`}
                    />
                  ))}
                  {group.indexErrors.map((error, index) => (
                    <ErrorItem
                      error={error}
                      errorType={'index'}
                      key={`${'index'}-${index}`}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Render flat list when a specific sheet is selected
          <>
            {filteredParsingErrors?.map((error, index) => (
              <ErrorItem
                error={error}
                errorType={'parsing'}
                key={`${'parsing'}-${index}`}
              />
            ))}
            {filteredCompilationErrors?.map((error, index) => (
              <ErrorItem
                error={error}
                errorType={'compile'}
                key={`${'compile'}-${index}`}
              />
            ))}
            {filteredRuntimeErrors?.map((error, index) => (
              <ErrorItem
                error={error}
                errorType={'runtime'}
                key={`${'runtime'}-${index}`}
              />
            ))}
            {filteredIndexErrors?.map((error, index) => (
              <ErrorItem
                error={error}
                errorType={'index'}
                key={`${'index'}-${index}`}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
