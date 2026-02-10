import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import {
  ControlData,
  useBusyIndicator,
  useClickOutside,
} from '@frontend/common';

import { GridApi, GridCell } from '../../types';
import {
  filterByTypeAndCast,
  focusSpreadsheet,
  getPx,
  GridEventBus,
} from '../../utils';
import { EventTypeOpenControl, GridEvent } from '../GridApiWrapper';
import { ControlCheckboxes, ControlDropdown } from './components';

const defaultPosition = { x: 0, y: 0 };

type Props = {
  controlData: ControlData | null;
  controlIsLoading: boolean;
  eventBus: GridEventBus;
  apiRef: RefObject<GridApi | null>;
  zoom?: number;
};

export function Control({
  apiRef,
  controlData,
  controlIsLoading,
  eventBus,
  zoom = 1,
}: Props) {
  const [controlOpened, setControlOpened] = useState(false);
  const [controlPosition, setControlPosition] = useState(defaultPosition);
  const [cell, setCell] = useState<GridCell | null>(null);
  const [enableClickOutside, setEnableClickOutside] = useState(false);

  const clickRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const gatedControlIsLoading = useBusyIndicator(controlIsLoading, {
    delay: 300,
    minDuration: 250,
  });

  const hideControl = useCallback(
    (onEscape = false) => {
      if (!controlOpened) return;

      setControlOpened(false);
      setEnableClickOutside(false);
      setCell(null);
      setControlPosition(defaultPosition);
      focusSpreadsheet();

      eventBus.emit({
        type: 'control/close',
        payload: {},
      });

      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (onEscape) return;
    },
    [controlOpened, eventBus],
  );

  useClickOutside(
    clickRef,
    () => hideControl(),
    ['mousedown', 'contextmenu'],
    false,
    enableClickOutside,
  );

  const showControl = useCallback(
    (cellData: GridCell) => {
      const api = apiRef.current;
      if (!api) return;

      if (controlOpened) {
        hideControl();
      }

      // set timeout to ensure a clear state of the control -
      // if control already opened and the user opens another one
      setTimeout(() => {
        const { row, startCol, table, field } = cellData;

        if (!table || !field) return;

        const x = api.getCellX(startCol);
        const y = api.getCellY(row + 1);

        // Disable click outside first when switching controls
        setEnableClickOutside(false);

        setCell(cellData);
        setControlOpened(true);
        setControlPosition({
          x,
          y: y * zoom,
        });

        // Enable click outside handler after a small delay to prevent immediate closure
        setTimeout(() => {
          setEnableClickOutside(true);
        }, 100);
        // Enable a click outside handler after the current event loop completes
        // Use requestAnimationFrame to ensure DOM is updated
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
          requestAnimationFrame(() => {
            setEnableClickOutside(true);
          });
        }, 50);

        eventBus.emit({
          type: 'control/get-values',
          payload: {
            tableName: table.tableName,
            fieldName: field.fieldName,
            getMoreValues: false,
            searchValue: '',
          },
        });
      }, 0);
    },
    [apiRef, controlOpened, hideControl, zoom, eventBus],
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      const isEscape = event.key === 'Escape';

      if (!isEscape) return;

      hideControl(true);
    },
    [hideControl],
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const gridViewportUnsubscribe = api.gridViewportSubscription(() =>
      hideControl(),
    );
    const openControlSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeOpenControl>(GridEvent.openControl))
      .subscribe(({ cellData }) => {
        showControl(cellData);
      });

    return () => {
      gridViewportUnsubscribe();
      openControlSubscription.unsubscribe();

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [apiRef, hideControl, showControl]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-305"
      id="controlContainer"
    >
      <div
        className="rounded-md wrap-break-word z-600 absolute transition-opacity p-2 bg-bg-layer-0 border border-stroke-primary shadow-lg"
        ref={clickRef}
        style={{
          top: controlPosition.y,
          left: controlPosition.x,
          opacity: controlOpened ? 1 : 0,
          fontSize: getPx(14 * zoom),
          pointerEvents: controlOpened ? 'auto' : 'none',
        }}
      >
        {cell?.field?.controlType === 'checkbox' && (
          <ControlCheckboxes
            cell={cell}
            controlData={controlData}
            controlIsLoading={gatedControlIsLoading}
            eventBus={eventBus}
            onClose={() => hideControl(false)}
          />
        )}
        {cell?.field?.controlType === 'dropdown' && (
          <ControlDropdown
            cell={cell}
            controlData={controlData}
            controlIsLoading={gatedControlIsLoading}
            eventBus={eventBus}
            onClose={() => hideControl(false)}
          />
        )}
      </div>
    </div>
  );
}
