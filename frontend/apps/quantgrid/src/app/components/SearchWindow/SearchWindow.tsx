import { Input, InputRef } from 'antd';
import cx from 'classnames';
import Fuse from 'fuse.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { KeyboardCode, Shortcut, shortcutApi } from '@frontend/common';

import {
  AppContext,
  ProjectContext,
  SearchWindowContext,
  SpreadsheetContext,
} from '../../context';
import { useApi, useOpenWorksheet } from '../../hooks';
import {
  ISearchFilter,
  ISearchResult,
  search,
  searchFilterTabs,
} from './search';
import { SearchFilter } from './SearchFilter';
import { SearchResult } from './SearchResult';
import styles from './SearchWindow.module.scss';

export function SearchWindow() {
  const { isOpen, closeSearchWindow } = useContext(SearchWindowContext);
  const { projects, projectSheets, parsedSheets, projectName } =
    useContext(ProjectContext);
  const { openField, openTable } = useContext(SpreadsheetContext);
  const { openProject, getProjects } = useApi();
  const { setLoading } = useContext(AppContext);
  const openWorksheet = useOpenWorksheet();
  const [filter, setFilter] = useState<ISearchFilter | null>(null);

  const inputRef = useRef<InputRef>(null);

  const [query, setQuery] = useState('');
  const [currentChosenIndex, setCurrentChosenIndex] = useState<number>(0);
  const resultCountRef = useRef(0);

  useEffect(() => {
    getProjects();
    if (!inputRef.current?.input) return;

    setQuery('');
    setTimeout(() => inputRef.current?.input?.focus());
  }, [getProjects, isOpen]);

  const results: Fuse.FuseResult<ISearchResult>[] | null = useMemo(
    () =>
      isOpen
        ? search(projects, projectSheets, parsedSheets, query, filter)
        : null,
    [filter, projectSheets, parsedSheets, projects, query, isOpen]
  );

  const onSubmit = useCallback(
    (result: ISearchResult) => {
      closeSearchWindow();
      switch (result.type) {
        case 'project': {
          setLoading(true);
          openProject(result.name);

          break;
        }
        case 'sheet': {
          if (!projectName) return;

          openWorksheet(projectName, result.name);

          break;
        }
        case 'table': {
          if (!result.path.sheetName || !result.path.tableName) return;

          openTable(result.path.sheetName, result.path.tableName);

          break;
        }
        case 'field': {
          if (
            !result.path.sheetName ||
            !result.path.tableName ||
            !result.path.fieldName
          ) {
            return;
          }
          openField(
            result.path.sheetName,
            result.path.tableName,
            result.path.fieldName
          );

          break;
        }
      }
    },
    [
      closeSearchWindow,
      openField,
      openProject,
      openTable,
      openWorksheet,
      projectName,
      setLoading,
    ]
  );

  useEffect(() => {
    const handleArrows = (event: KeyboardEvent) => {
      if (event.key === KeyboardCode.ArrowUp) {
        setCurrentChosenIndex((value) => {
          if (value === 0) return 0;

          return value - 1;
        });
        event.preventDefault();
      }
      if (event.key === KeyboardCode.ArrowDown) {
        setCurrentChosenIndex((value) => {
          return Math.min(value + 1, resultCountRef.current);
        });
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleArrows);

    return () => {
      window.removeEventListener('keydown', handleArrows);
    };
  }, []);

  useEffect(() => {
    if (!results || !results.length) {
      resultCountRef.current = 0;

      return;
    }

    resultCountRef.current = results.length - 1;
    setCurrentChosenIndex(0);
  }, [results]);

  useEffect(() => {
    const handleSubmit = (event: KeyboardEvent) => {
      if (
        event.key === KeyboardCode.Enter &&
        currentChosenIndex !== null &&
        results
      ) {
        const currentItem = results[currentChosenIndex].item;
        onSubmit(currentItem);
      }
    };

    window.addEventListener('keydown', handleSubmit);

    return () => {
      window.removeEventListener('keydown', handleSubmit);
    };
  }, [currentChosenIndex, onSubmit, results]);

  useEffect(() => {
    const handleSwitchFilter = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const isTab = event.code === KeyboardCode.Tab;
      const isShiftTab = shortcutApi.is(Shortcut.MoveTabBackward, event);

      if (!isTab && !isShiftTab) return;

      event.preventDefault();

      const currentTab = searchFilterTabs.findIndex((f) => f === filter);

      if (isShiftTab) {
        const nextTab =
          currentTab - 1 < 0
            ? searchFilterTabs[searchFilterTabs.length - 1]
            : searchFilterTabs[currentTab - 1];

        setFilter(nextTab);
      } else if (isTab) {
        const nextTab =
          currentTab + 1 >= searchFilterTabs.length
            ? searchFilterTabs[0]
            : searchFilterTabs[currentTab + 1];

        setFilter(nextTab);
      }
    };

    window.addEventListener('keydown', handleSwitchFilter);

    return () => {
      window.removeEventListener('keydown', handleSwitchFilter);
    };
  }, [currentChosenIndex, filter, isOpen, onSubmit, results]);

  return (
    <div className="w-full h-full pb-5 pt-2">
      <div className="flex mb-2">
        <SearchFilter
          filterName="All"
          selected={filter === null}
          onClick={() => setFilter(null)}
        />
        <SearchFilter
          filterName="Projects"
          selected={filter === 'projects'}
          onClick={() => setFilter('projects')}
        />
        <SearchFilter
          filterName="Sheets"
          selected={filter === 'sheets'}
          onClick={() => setFilter('sheets')}
        />
        <SearchFilter
          filterName="Tables"
          selected={filter === 'tables'}
          onClick={() => setFilter('tables')}
        />
        <SearchFilter
          filterName="Fields"
          selected={filter === 'fields'}
          onClick={() => setFilter('fields')}
        />
      </div>
      <Input
        placeholder="Sheet1, someproject, table_derived, [f1]"
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="pt-2 pb-2 overflow-auto h-max max-h-96">
        {results && results.length === 0 && (
          <div className={styles.noResults}>No results.</div>
        )}
        {results?.map((result, index) => (
          <SearchResult
            className={cx('p-2 cursor-pointer', styles.result, {
              [styles.selectedResult]: index === currentChosenIndex,
            })}
            key={result.item.name + result.item.type + index}
            result={result}
            onClick={() => onSubmit(result.item)}
          />
        ))}
      </div>
    </div>
  );
}
