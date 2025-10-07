import { Dropdown, MenuProps, Tooltip } from 'antd';
import classNames from 'classnames';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  WheelEvent,
} from 'react';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  disabledTooltips,
  getDropdownItem,
  MenuItem,
  PlusIcon,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useProjectActions, useProjectMode } from '../../../hooks';

const defaultScrollDelta = 25;

export const SheetSelect = () => {
  const sheetsItemsRef = useRef<HTMLDivElement>(null);
  const { projectSheets, openSheet, sheetName } = useContext(ProjectContext);
  const {
    createWorksheetAction,
    renameWorksheetAction,
    deleteWorksheetAction,
  } = useProjectActions();

  const { isDefaultMode } = useProjectMode();
  const [isSheetsFullVisible, setIsSheetsFullVisible] = useState(true);
  const [isLeftSheetsScrollable, setIsLeftSheetsScrollable] = useState(true);
  const [isRightSheetsScrollable, setIsRightSheetsScrollable] = useState(true);
  const [isSheetSelectDropdownOpened, setIsSheetSelectDropdownOpened] =
    useState(false);

  const sheetsDropdownItems: MenuProps['items'] = useMemo(
    () =>
      projectSheets
        ?.map((sheet) =>
          getDropdownItem({
            key: sheet.sheetName,
            label: sheet.sheetName,
            onClick: async () => {
              openSheet(sheet);
            },
          })
        )
        .filter(Boolean) as MenuProps['items'],
    [openSheet, projectSheets]
  );

  const getSheetActions = useCallback(
    (name: string): MenuItem[] => {
      const projectSheet = projectSheets?.find(
        (sheet) => sheet.sheetName === name
      );

      if (!projectSheet) return [];

      return [
        getDropdownItem({
          key: 'selectSheet',
          label: 'Select Worksheet',
          onClick: () => openSheet(projectSheet),
          disabled: sheetName === name,
          tooltip: sheetName === name ? 'Sheet already selected' : undefined,
        }),
        getDropdownItem({
          key: 'renameSheet',
          label: 'Rename Worksheet',
          disabled: !isDefaultMode,
          tooltip: disabledTooltips.notAllowedChanges,
          onClick: () => renameWorksheetAction(projectSheet.sheetName),
        }),
        getDropdownItem({
          key: 'deleteSheet',
          label: 'Delete Worksheet',
          disabled: !isDefaultMode,
          tooltip: disabledTooltips.notAllowedChanges,
          onClick: () => deleteWorksheetAction(projectSheet.sheetName),
        }),
      ];
    },
    [
      projectSheets,
      sheetName,
      isDefaultMode,
      openSheet,
      renameWorksheetAction,
      deleteWorksheetAction,
    ]
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
    <div className="@container grow min-w-[25%]">
      <div className="@[200px]:flex hidden gap-0.5 items-center overflow-x-hidden ">
        <div className="flex gap-1 items-center shrink-0">
          <button
            className="size-[18px] rotate-90 hover:text-text-accent-primary disabled:text-controls-text-disable"
            disabled={!isLeftSheetsScrollable}
            onClick={scrollLeft}
          >
            <Icon component={() => <ChevronDown />} />
          </button>
          <button
            className="size-[18px] -rotate-90 hover:text-text-accent-primary disabled:text-controls-text-disable"
            disabled={!isRightSheetsScrollable}
            onClick={scrollRight}
          >
            <Icon component={() => <ChevronDown />} />
          </button>
        </div>
        <div className="flex gap-0.5 items-center overflow-x-hidden relative max-w-full">
          <div
            className="flex items-center overflow-x-auto hidden-scrollbar"
            ref={sheetsItemsRef}
            onScroll={() => checkSheetWrapper()}
            onWheel={handleWheel}
          >
            {projectSheets?.map((sheet) => (
              <Dropdown
                key={sheet.sheetName}
                menu={{ items: getSheetActions(sheet.sheetName) }}
                trigger={['contextMenu']}
              >
                <button
                  className={classNames(
                    'px-3 py-2 text-sm text-text-secondary leading-none text-nowrap h-[31px]',
                    sheetName === sheet.sheetName
                      ? 'bg-bg-accent-primary-alpha-2 border-t border-stroke-accent-primary'
                      : 'hover:bg-bg-accent-primary-alpha'
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
                <div className="z-10 top-0 absolute w-7 from-transparent to-bg-layer-1 bg-linear-to-l h-full left-0"></div>
              )}
              {isRightSheetsScrollable && (
                <div className="z-10 top-0 absolute w-7 from-transparent to-bg-layer-1 bg-linear-to-r h-full right-0"></div>
              )}
            </>
          )}
        </div>
        {isDefaultMode && (
          <Tooltip placement="bottom" title="Create worksheet" destroyOnHidden>
            <button
              className={classNames(
                'flex items-center justify-center p-2 h-full shrink-0 text-sm text-text-secondary hover:bg-bg-accent-primary-alpha'
              )}
              onClick={() => createWorksheetAction()}
            >
              <Icon
                className="stroke-text-secondary w-[14px]"
                component={() => <PlusIcon />}
              />
            </button>
          </Tooltip>
        )}
      </div>

      {sheetName && (
        <div className="flex @[200px]:hidden items-center h-[31px]">
          <Dropdown
            className="flex items-center"
            menu={{ items: sheetsDropdownItems }}
            trigger={['click']}
            onOpenChange={setIsSheetSelectDropdownOpened}
          >
            <Dropdown
              key={sheetName}
              menu={{ items: getSheetActions(sheetName) }}
              trigger={['contextMenu']}
            >
              <div className="h-full gap-1 px-3 py-2 text-sm text-text-secondary leading-none text-nowrap bg-bg-accent-primary-alpha-2 border-t border-stroke-accent-primary">
                <span>{sheetName}</span>
                <Icon
                  className={classNames(
                    'w-[14px] text-text-secondary leading-none transition-all',
                    isSheetSelectDropdownOpened && 'rotate-180'
                  )}
                  component={() => <ChevronDown />}
                />
              </div>
            </Dropdown>
          </Dropdown>
        </div>
      )}
    </div>
  );
};
