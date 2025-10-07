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
import { useNavigate } from 'react-router-dom';

import {
  inputClasses,
  KeyboardCode,
  SearchIcon,
  Shortcut,
  shortcutApi,
} from '@frontend/common';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  SearchWindowContext,
} from '../../context';
import { getProjectNavigateUrl } from '../../utils';
import { ISearchResult, search, searchFilterTabs } from './search';
import { SearchFilter } from './SearchFilter';
import { SearchResult } from './SearchResult';

export function SearchWindow() {
  const {
    isOpen,
    closeSearchWindow,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
  } = useContext(SearchWindowContext);
  const {
    projectName,
    projectBucket,
    projectPath,
    openSheet,
    getProjects,
    projects,
    projectSheets,
    parsedSheets,
  } = useContext(ProjectContext);
  const navigate = useNavigate();
  const { openField, openTable } = useContext(AppSpreadsheetInteractionContext);

  const inputRef = useRef<InputRef>(null);

  const [currentChosenIndex, setCurrentChosenIndex] = useState<number>(0);
  const resultCountRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    getProjects();
    if (!inputRef.current?.input) return;

    setTimeout(() => inputRef.current?.input?.focus());
  }, [getProjects, isOpen]);

  const results: Fuse.FuseResult<ISearchResult>[] | null = useMemo(
    () =>
      isOpen && projectBucket
        ? search(
            projects,
            projectSheets,
            parsedSheets,
            searchQuery,
            filter,
            projectBucket,
            projectPath
          )
        : null,
    [
      filter,
      isOpen,
      parsedSheets,
      projectBucket,
      projectPath,
      projectSheets,
      projects,
      searchQuery,
    ]
  );

  const onSubmit = useCallback(
    (result: ISearchResult) => {
      closeSearchWindow();
      switch (result.type) {
        case 'project': {
          navigate(
            getProjectNavigateUrl({
              projectName: result.path.projectName,
              projectBucket: result.path.projectBucket,
              projectPath: result.path.projectPath,
            })
          );

          break;
        }
        case 'sheet': {
          if (!projectName) return;

          openSheet({ sheetName: result.name });

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
    [closeSearchWindow, navigate, openField, openSheet, openTable, projectName]
  );

  const onKeydown = useCallback((event: React.KeyboardEvent) => {
    if (
      event.key === KeyboardCode.Delete ||
      event.key === KeyboardCode.Backspace
    ) {
      event.stopPropagation();
    }
  }, []);

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
  }, [currentChosenIndex, filter, isOpen, onSubmit, results, setFilter]);

  return (
    <div className="w-full h-full pb-5">
      <Input
        className={cx('ant-input-sm h-[38px] text-[13px]', inputClasses)}
        placeholder="Search..."
        prefix={
          <div className="text-text-secondary size-[18px] shrink-0">
            <SearchIcon />
          </div>
        }
        ref={inputRef}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={onKeydown}
      />
      <div className="flex items-center mt-5 mb-4 overflow-x-auto hidden-scrollbar">
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
        <span className="hidden md:block text-[10px] text-text-secondary">
          Tab or Shift+Tab to switch
        </span>
      </div>
      <div className="thin-scrollbar py-2 pr-2 overflow-auto h-max max-h-96 bg-bg-layer-3">
        {results && results.length === 0 && (
          <div className="text-text-primary pl-3">No results.</div>
        )}
        {results?.map((result, index) => (
          <SearchResult
            className={cx(
              'p-2 mb-1 cursor-pointer rounded-[3px] border-b-stroke-tertiary select-none hover:bg-bg-accent-primary-alpha',
              index === currentChosenIndex
                ? 'border-l-2 border-l-stroke-accent-primary bg-bg-accent-primary-alpha stroke-text-primary'
                : 'stroke-text-secondary'
            )}
            key={result.item.name + result.item.type + index}
            result={result}
            onClick={() => onSubmit(result.item)}
          />
        ))}
      </div>
    </div>
  );
}
