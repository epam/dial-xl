import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  commentToNote,
  shouldStopPropagation,
  useClickOutside,
} from '@frontend/common';

import { noteTextAreaId } from '../../constants';
import { GridApi, GridCallbacks, GridCell } from '../../types';
import { filterByTypeAndCast, focusSpreadsheet, getPx } from '../../utils';
import {
  EventTypeOpenNote,
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridEvent,
} from '../GridApiWrapper';

const defaultPosition = { x: 0, y: 0 };
const noteAutoHideTimeout = 2000;
const verticalOffset = 5;

type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: GridApi | null;
  zoom?: number;
};

export function Notes({ gridCallbacksRef, api, zoom = 1 }: Props) {
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

  const hideNote = useCallback(
    (onEscape = false) => {
      if (!noteOpened || (!onEscape && mouseOver.current)) return;

      if (
        !onEscape &&
        gridCallbacksRef.current &&
        cell?.table?.tableName &&
        note !== initialNote
      ) {
        gridCallbacksRef.current.onUpdateNote?.({
          tableName: cell.table.tableName,
          fieldName: cell.field?.fieldName,
          note,
        });
      }

      setNoteOpened(false);
      setInitialNote('');
      setNote('');
      setCell(null);
      setOpenedExplicitly(false);
      setNotePosition(defaultPosition);
      focusSpreadsheet();
    },
    [noteOpened, gridCallbacksRef, cell, note, initialNote]
  );

  const onClickOutside = useCallback(() => {
    setOpenedExplicitly(false);
    hideNote();
  }, [hideNote]);

  useClickOutside(clickRef, onClickOutside);

  const showNote = useCallback(
    (cell: GridCell, x: number, y: number) => {
      const noteData =
        (cell.isTableHeader
          ? cell.table?.note
          : cell.isFieldHeader
          ? cell.field?.note
          : '') ?? '';
      const note = commentToNote(noteData);

      setInitialNote(note);
      setNote(note);
      setCell(cell);
      setNoteOpened(true);

      setNotePosition({
        x,
        y: y + verticalOffset * zoom,
      });
    },
    [zoom]
  );

  const showNoteExplicitly = useCallback(
    (col: number, row: number) => {
      if (!api || restrictOpening) return;

      const cell = api.getCell(col, row);

      if (!cell) return;

      const { endCol } = cell;
      const x = api.getCellX(endCol + 1);
      const y = api.getCellY(row);

      setOpenedExplicitly(true);
      showNote(cell, x, y);

      setTimeout(() => {
        noteRef.current?.focus();
      }, 0);
    },
    [api, showNote, restrictOpening]
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
    [hideNote, noteOpened]
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
    if (!api) return;

    const gridViewportUnsubscribe = api.gridViewportSubscription(onScroll);
    const openNoteSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeOpenNote>(GridEvent.openNote))
      .subscribe(({ col, row }) => {
        showNoteExplicitly(col, row);
      });

    const startMoveModeSubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode)
      )
      .subscribe(() => {
        setRestrictOpening(true);
      });

    const stopMoveModeSubscription = api.events$
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
  }, [api, onScroll, showNoteExplicitly]);

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
