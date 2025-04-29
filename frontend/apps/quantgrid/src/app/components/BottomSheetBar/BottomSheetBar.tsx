import { Dropdown, Tooltip } from 'antd';
import classNames from 'classnames';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  WheelEvent,
} from 'react';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  getDropdownItem,
  MenuItem,
  PlusIcon,
  WorksheetState,
} from '@frontend/common';

import { ProjectContext } from '../../context';
import { useGridApi, useProjectActions } from '../../hooks';
import { MoveMode } from './MoveMode';
import { Zoom } from './Zoom';

const defaultScrollDelta = 25;

export const BottomSheetBar = () => {
  const sheetsItemsRef = useRef<HTMLDivElement>(null);
  const { projectSheets, openSheet, sheetName } = useContext(ProjectContext);
  const {
    createWorksheetAction,
    renameWorksheetAction,
    deleteWorksheetAction,
  } = useProjectActions();
  const api = useGridApi();
  const [isSheetsFullVisible, setIsSheetsFullVisible] = useState(true);
  const [isLeftSheetsScrollable, setIsLeftSheetsScrollable] = useState(true);
  const [isRightSheetsScrollable, setIsRightSheetsScrollable] = useState(true);
  const [fieldSize, setFieldSize] = useState<number | null>(null);

  const getSheetActions = useCallback(
    (sheet: WorksheetState): MenuItem[] => {
      return [
        getDropdownItem({
          key: 'selectSheet',
          label: 'Select Worksheet',
          onClick: () => openSheet(sheet),
        }),
        getDropdownItem({
          key: 'renameSheet',
          label: 'Rename Worksheet',
          onClick: () => renameWorksheetAction(sheet.sheetName),
        }),
        getDropdownItem({
          key: 'deleteSheet',
          label: 'Delete Worksheet',
          onClick: () => deleteWorksheetAction(sheet.sheetName),
        }),
      ];
    },
    [deleteWorksheetAction, openSheet, renameWorksheetAction]
  );

  const checkSheetWrapper = useCallback(() => {
    const element = sheetsItemsRef.current;

    if (!element) return;

    const hasHorizontalScrollbar = element.scrollWidth > element.offsetWidth;
    const isHorizontallyScrolled = element.scrollLeft > 0;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const canScrollMoreRight = element.scrollLeft < maxScrollLeft;

    setIsSheetsFullVisible(!hasHorizontalScrollbar);
    setIsLeftSheetsScrollable(isHorizontallyScrolled);
    setIsRightSheetsScrollable(canScrollMoreRight);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!sheetsItemsRef.current) return;

      sheetsItemsRef.current.scrollLeft += event.deltaY;

      checkSheetWrapper();
    },
    [checkSheetWrapper]
  );

  const scrollRight = useCallback(() => {
    if (!sheetsItemsRef.current) return;

    sheetsItemsRef.current.scrollLeft += defaultScrollDelta;

    checkSheetWrapper();
  }, [checkSheetWrapper]);

  const scrollLeft = useCallback(() => {
    if (!sheetsItemsRef.current) return;

    sheetsItemsRef.current.scrollLeft = Math.max(
      0,
      sheetsItemsRef.current.scrollLeft - defaultScrollDelta
    );

    checkSheetWrapper();
  }, [checkSheetWrapper]);

  useEffect(() => {
    const sub = api?.selection$.subscribe((selection) => {
      if (!api) return;

      if (!selection) {
        setFieldSize(null);

        return;
      }

      const startCol = Math.min(selection.startCol, selection.endCol);
      const endCol = Math.max(selection.startCol, selection.endCol);
      const startRow = Math.min(selection.startRow, selection.endRow);
      const endRow = Math.max(selection.startRow, selection.endRow);

      const cells = [];

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const cell = api.getCell(col, row);

          if (!cell || cell.startCol !== col) continue;

          cells.push(cell);
        }
      }

      const selectionFields = cells.reduce((acc, curr) => {
        if (!curr.field) return acc;

        if (!acc[curr.field.fieldName]) {
          acc[curr.field.fieldName] = curr.field.dataLength;
        }

        return acc;
      }, {} as Record<string, number>);

      const keys = Object.keys(selectionFields);

      if (keys.length !== 1) {
        setFieldSize(null);

        return;
      }

      Object.values(selectionFields).forEach((dataLength) => {
        setFieldSize(dataLength);
      });
    });

    return () => sub?.unsubscribe();
  }, [api, api?.selection$]);

  useEffect(() => {
    const element = sheetsItemsRef.current;
    if (!element) {
      return;
    }

    // Define the callback function for the ResizeObserver
    const resizeCallback = (entries: ResizeObserverEntry[]) => {
      if (!entries.length) return;

      checkSheetWrapper();
    };

    const observer = new ResizeObserver(resizeCallback);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [checkSheetWrapper]);

  useEffect(() => {
    const el = document.getElementById(`bottom-bar-sheet-${sheetName}`);

    el?.scrollIntoView({ inline: 'center' });

    setTimeout(() => {
      checkSheetWrapper();
    }, 0);
  }, [checkSheetWrapper, sheetName]);

  return (
    <div className="flex justify-between gap-10 items-center border-t border-strokePrimary px-1 text-sm text-textSecondary overflow-x-hidden bg-bgLayer1">
      <div className="flex gap-0.5 items-center overflow-x-hidden">
        <div className="flex gap-1 items-center">
          <button
            className="size-[18px] rotate-90 hover:text-textAccentPrimary disabled:text-controlsTextDisable"
            disabled={!isLeftSheetsScrollable}
            onClick={scrollLeft}
          >
            <Icon component={() => <ChevronDown />} />
          </button>
          <button
            className="size-[18px] -rotate-90 hover:text-textAccentPrimary disabled:text-controlsTextDisable"
            disabled={!isRightSheetsScrollable}
            onClick={scrollRight}
          >
            <Icon component={() => <ChevronDown />} />
          </button>
        </div>
        <div className="flex gap-0.5 items-center overflow-x-hidden relative">
          <div
            className="flex items-center overflow-x-auto hidden-scrollbar"
            ref={sheetsItemsRef}
            onWheel={handleWheel}
          >
            {projectSheets?.map((sheet) => (
              <Dropdown
                key={sheet.sheetName}
                menu={{ items: getSheetActions(sheet) }}
                trigger={['contextMenu']}
              >
                <button
                  className={classNames(
                    'px-3 py-2 text-sm text-textSecondary leading-none text-nowrap',
                    sheetName === sheet.sheetName
                      ? 'bg-bgAccentPrimaryAlpha2 border-t border-strokeAccentPrimary'
                      : 'hover:bg-bgAccentPrimaryAlpha'
                  )}
                  id={`bottom-bar-sheet-${sheet.sheetName}`}
                  onClick={() => openSheet({ sheetName: sheet.sheetName })}
                >
                  {sheet.sheetName}
                </button>
              </Dropdown>
            ))}
          </div>
          {/* Right blur */}
          {!isSheetsFullVisible && (
            <>
              {isLeftSheetsScrollable && (
                <div className="z-10 top-0 absolute w-7 from-transparent to-bgLayer1 bg-gradient-to-l h-full left-0"></div>
              )}
              {isRightSheetsScrollable && (
                <div className="z-10 top-0 absolute w-7 from-transparent to-bgLayer1 bg-gradient-to-r h-full right-0"></div>
              )}
            </>
          )}
        </div>
        <Tooltip placement="bottom" title="Create worksheet">
          <button
            className={classNames(
              'flex items-center justify-center p-2 h-full shrink-0 text-sm text-textSecondary hover:bg-bgAccentPrimaryAlpha'
            )}
            onClick={() => createWorksheetAction()}
          >
            <Icon
              className="stroke-textSecondary w-[14px]"
              component={() => <PlusIcon />}
            />
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center text-textPrimary gap-3 shrink-0">
        {fieldSize !== null && (
          <span title={`${fieldSize}`}>Column size: {fieldSize}</span>
        )}

        <MoveMode />
        <Zoom />
      </div>
    </div>
  );
};
