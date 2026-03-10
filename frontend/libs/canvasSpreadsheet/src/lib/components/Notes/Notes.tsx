import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  commentToNote,
  shouldStopPropagation,
  useClickOutside,
} from '@frontend/common';

import { noteTextAreaId } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import {
  EventTypeOpenNote,
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridCell,
  GridEvent,
} from '../../types';
import {
  filterByTypeAndCast,
  focusSpreadsheet,
  getPx,
  GridEventBus,
} from '../../utils';

const defaultPosition = { x: 0, y: 0 };
const noteAutoHideTimeout = 2000;
const verticalOffset = 5;

type Props = {
  eventBus: GridEventBus;
};

export function Notes({ eventBus }: Props) {
  const { events$, getCell, zoom, canvasId } = useContext(GridStateContext);
  const { getCellX, getCellY, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [noteOpened, setNoteOpened] = useState(false);
  const [notePosition, setNotePosition] = useState(defaultPosition);
  const [cell, setCell] = useState<GridCell | null>(null);
  const [initialNote, setInitialNote] = useState('');
  const [note, setNote] = useState('');
  const [openedExplicitly, setOpenedExplicitly] = useState(false);
  const [restrictOpening, setRestrictOpening] = useState(false);
  const mouseOver = useRef(false);
  const clickRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const pendingFocusRef = useRef(false);

  const hideNote = useCallback(
    (onEscape = false) => {
      if (!noteOpened || (!onEscape && mouseOver.current)) return;

      if (!onEscape && cell?.table?.tableName && note !== initialNote) {
        eventBus.emit({
          type: 'notes/update',
          payload: {
            tableName: cell.table.tableName,
            fieldName: cell.field?.fieldName,
            note,
          },
        });
      }

      setNoteOpened(false);
      setInitialNote('');
      setNote('');
      setCell(null);
      setOpenedExplicitly(false);
      setNotePosition(defaultPosition);
      focusSpreadsheet(canvasId);
    },
    [canvasId, noteOpened, eventBus, cell, note, initialNote],
  );

  const onClickOutside = useCallback(() => {
    setOpenedExplicitly(false);
    hideNote();
  }, [hideNote]);

  useClickOutside(clickRef, onClickOutside);

  const showNote = useCallback(
    (cell: GridCell, x: number, y: number) => {
      const note = commentToNote(getNote(cell));

      setInitialNote(note);
      setNote(note);
      setCell(cell);
      setNoteOpened(true);

      setNotePosition({
        x,
        y: y + verticalOffset * zoom,
      });
    },
    [zoom],
  );

  const showNoteExplicitly = useCallback(
    (col: number, row: number) => {
      if (restrictOpening) return;

      const cell = getCell(col, row);

      if (!cell) return;

      const { endCol } = cell;
      const x = getCellX(endCol + 1);
      const y = getCellY(row);

      setOpenedExplicitly(true);
      showNote(cell, x, y);
      pendingFocusRef.current = true;
    },
    [restrictOpening, getCell, getCellX, getCellY, showNote],
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      const isEscape = event.key === 'Escape';

      if (noteOpened && shouldStopPropagation(event)) {
        event.stopPropagation();
      }

      if (!isEscape) return;

      hideNote(true);
    },
    [hideNote, noteOpened],
  );

  const handleMouseLeave = useCallback(() => {
    mouseOver.current = false;

    if (openedExplicitly) return;

    setTimeout(() => {
      if (mouseOver.current) return;

      hideNote();
    }, noteAutoHideTimeout);
  }, [hideNote, openedExplicitly]);

  const onScroll = useCallback(() => {
    hideNote();
  }, [hideNote]);

  useEffect(() => {
    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  useEffect(() => {
    const gridViewportUnsubscribe =
      gridViewportSubscriber.current.subscribe(onScroll);
    const openNoteSubscription = events$
      .pipe(filterByTypeAndCast<EventTypeOpenNote>(GridEvent.openNote))
      .subscribe(({ col, row }) => {
        showNoteExplicitly(col, row);
      });

    const startMoveModeSubscription = events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode),
      )
      .subscribe(() => {
        setRestrictOpening(true);
      });

    const stopMoveModeSubscription = events$
      .pipe(filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode))
      .subscribe(() => {
        setRestrictOpening(false);
      });

    return () => {
      gridViewportUnsubscribe();
      [
        openNoteSubscription,
        startMoveModeSubscription,
        stopMoveModeSubscription,
      ].forEach((s) => s.unsubscribe());
    };
  }, [events$, gridViewportSubscriber, onScroll, showNoteExplicitly]);

  useLayoutEffect(() => {
    if (!noteOpened || !pendingFocusRef.current) return;

    pendingFocusRef.current = false;
    noteRef.current?.focus();
  }, [noteOpened]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-[305]"
      id="notesContainer"
    >
      <div
        className="rounded-md break-words z-600 absolute transition-opacity"
        ref={clickRef}
        style={{
          top: notePosition.y,
          left: notePosition.x,
          opacity: noteOpened ? 1 : 0,
          fontSize: getPx(14 * zoom),
        }}
      >
        <textarea
          className="bg-yellow-50 border border-gray-900 p-2 min-w-[100px] min-h-[150px] h-[150px] pointer-events-auto transition-opacity resize"
          id={noteTextAreaId}
          ref={noteRef}
          style={{
            display: noteOpened ? 'block' : 'none',
          }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onMouseLeave={handleMouseLeave}
          onMouseOver={() => (mouseOver.current = true)}
        />
      </div>
    </div>
  );
}

function getNote(cell: GridCell) {
  const tableNote = cell.table?.note ?? '';
  const fieldNote = cell.field?.note ?? '';

  if (cell.table?.chartType) return tableNote;
  if (cell.isTableHeader) return tableNote;

  return fieldNote;
}
