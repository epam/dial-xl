import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  commentToNote,
  getDataScroller,
  GridCell,
  shouldStopPropagation,
  useClickOutside,
} from '@frontend/common';

import {
  commentTextClass,
  gridDataContainerClass,
  noteTextAreaId,
} from '../../constants';
import {
  EventTypeOpenNote,
  filterByTypeAndCast,
  Grid,
  GridEvent,
  GridSelectionEventStartMoveMode,
  GridSelectionEventStopMoveMode,
  GridSelectionEventType,
} from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';
import {
  focusSpreadsheet,
  getCellElement,
  getCellElementDimensions,
  getGridRoot,
  getPx,
} from '../../utils';

const defaultPosition = { x: 0, y: 0 };
const noteAutoHideTimeout = 2000;

type Props = {
  gridServiceRef: MutableRefObject<GridService | null>;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
  zoom?: number;
};

export function Note({
  gridServiceRef,
  gridCallbacksRef,
  api,
  zoom = 1,
}: Props) {
  const [noteOpened, setNoteOpened] = useState(false);
  const [notePosition, setNotePosition] = useState(defaultPosition);
  const [cell, setCell] = useState<GridCell | null>(null);
  const [initialNote, setInitialNote] = useState('');
  const [note, setNote] = useState('');
  const [openedExplicitly, setOpenedExplicitly] = useState(false);
  const [restrictOpening, setRestrictOpening] = useState(false);
  const [targetPos, setTargetPos] = useState(defaultPosition);
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
        cell?.field?.fieldName &&
        note !== initialNote
      ) {
        gridCallbacksRef.current.onUpdateNote?.(
          cell.table.tableName,
          cell.field.fieldName,
          note
        );
      }

      setNoteOpened(false);
      setInitialNote('');
      setNote('');
      setCell(null);
      setOpenedExplicitly(false);
      setNotePosition(defaultPosition);
      setTargetPos(defaultPosition);
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
      const { top, left } = getGridRoot().getBoundingClientRect();
      const note = commentToNote(cell.field?.note || '');

      setInitialNote(note);
      setNote(note);
      setCell(cell);
      setNoteOpened(true);

      setNotePosition({
        x: x - left,
        y: y - top,
      });
    },
    [setNoteOpened, setNotePosition]
  );

  const showNoteExplicitly = useCallback(
    (col: number, row: number) => {
      const cell = gridServiceRef.current?.getCellValue(row, col);
      const cellElement = getCellElement(col, row);

      if (!cellElement || !cell) return;

      const { x, y, width } = cellElement.getBoundingClientRect();

      setOpenedExplicitly(true);
      showNote(cell, x + width, y);

      setTimeout(() => {
        noteRef.current?.focus();
      }, 0);
    },
    [gridServiceRef, showNote]
  );

  const onMouseOver = useCallback(
    (event: any) => {
      if (!api || restrictOpening) return;

      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataContainer) return;

      let target = event.target;

      while (target && target !== dataContainer) {
        if (target.nodeName === 'DIV') {
          if (target.classList.contains(commentTextClass)) {
            const { col, row } = getCellElementDimensions(target.parentNode);

            if (col === -1 || row === -1) break;

            const cell = gridServiceRef.current?.getCellValue(row, col);

            if (cell?.field?.note) {
              const { x, y } = target.getBoundingClientRect();

              if (targetPos.x === x && targetPos.y === y) return;

              showNote(cell, event.clientX, event.clientY);

              setTargetPos({ x, y });

              return;
            }
          }
        }

        target = target.parentNode;
      }
    },
    [api, restrictOpening, gridServiceRef, targetPos, showNote]
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
    if (!api) return;

    const openNoteSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeOpenNote>(GridEvent.openNote))
      .subscribe(({ col, row }) => {
        showNoteExplicitly(col, row);
      });

    const startMoveModeSubscription = api.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStartMoveMode>(
          GridSelectionEventType.StartMoveMode
        )
      )
      .subscribe(() => {
        setRestrictOpening(true);
      });

    const stopMoveModeSubscription = api.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStopMoveMode>(
          GridSelectionEventType.StopMoveMode
        )
      )
      .subscribe(() => {
        setRestrictOpening(false);
      });

    return () => {
      [
        openNoteSubscription,
        startMoveModeSubscription,
        stopMoveModeSubscription,
      ].forEach((s) => s.unsubscribe());
    };
  }, [api, showNoteExplicitly]);

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);
    const gridDataScroller = getDataScroller();

    if (!dataContainer || !gridDataScroller) return;

    dataContainer.addEventListener('mouseover', onMouseOver);
    document.addEventListener('keydown', onKeydown);
    gridDataScroller.addEventListener('scroll', onScroll);

    return () => {
      dataContainer.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('keydown', onKeydown);
      gridDataScroller.removeEventListener('scroll', onScroll);
    };
  }, [onMouseOver, onKeydown, onScroll]);

  return (
    <div className="h-full w-full absolute overflow-hidden" id="notesContainer">
      <div
        className="rounded-md break-words z-[600] absolute transition-opacity"
        ref={clickRef}
        style={{
          top: notePosition.y,
          left: notePosition.x,
          opacity: noteOpened ? 1 : 0,
          fontSize: getPx(14 * zoom),
        }}
      >
        <textarea
          className="bg-yellow-50 border border-gray-900 p-2 min-w-[100px] min-h-[150px] h-[150px] transition-opacity resize"
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
