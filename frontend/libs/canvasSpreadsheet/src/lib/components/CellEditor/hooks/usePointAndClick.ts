import { useCallback, useContext, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';

import { GridStateContext } from '../../../context';
import { filterByTypeAndCast, GridEventBus } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';
import {
  GridCellEditorEventSetPointClickValue,
  GridCellEditorEventType,
} from '../types';

type Props = {
  eventBus: GridEventBus;
};

export function usePointAndClick({ eventBus }: Props) {
  const { setSelectionEdges, cellEditorEvent$, pointClickMode } =
    useContext(GridStateContext);
  const { setFocus, setCode, codeValue, onCodeChange } =
    useContext(CellEditorContext);

  const cursorOffset = useRef<number>(0);
  const lastPointClickValue = useRef<string>('');
  const lastCodeEditorValue = useRef<string>('');

  const onStartPointClick = useCallback(
    (offset: number) => {
      cursorOffset.current = offset;
      eventBus.emit({
        type: 'selection/point-click-started',
      });
    },
    [eventBus],
  );

  const onStopPointClick = useCallback(
    (offset: number) => {
      const isSameValue = codeValue.current === lastCodeEditorValue.current;

      const isOffsetChanged =
        cursorOffset.current + lastPointClickValue.current.length !== offset;

      if (isSameValue && !isOffsetChanged) {
        return;
      }

      lastPointClickValue.current = '';
      lastCodeEditorValue.current = '';
      cursorOffset.current = 0;

      if (!pointClickMode) {
        return;
      }

      setSelectionEdges(null, { silent: true });
      eventBus.emit({
        type: 'selection/point-click-stopped',
      });
    },
    [codeValue, eventBus, pointClickMode, setSelectionEdges],
  );

  const onSetPointClickValue = useCallback(
    (value: string) => {
      const currentValue = codeValue.current || '';
      const offset = cursorOffset.current;
      const updatedOffset = lastPointClickValue.current
        ? offset + lastPointClickValue.current.length
        : offset;
      const updatedValue =
        currentValue.slice(0, offset) +
        value +
        currentValue.slice(updatedOffset);

      lastCodeEditorValue.current = updatedValue;
      lastPointClickValue.current = value;
      const newCursorOffset = offset + value.length;

      setCode.current?.(updatedValue);

      setTimeout(() => {
        setFocus.current?.({ cursorOffset: newCursorOffset });
        onCodeChange(updatedValue);
      }, 0);
    },
    [codeValue, onCodeChange, setCode, setFocus],
  );

  useEffect(() => {
    const subscriptions: Subscription[] = [];

    subscriptions.push(
      cellEditorEvent$.current
        .pipe(
          filterByTypeAndCast<GridCellEditorEventSetPointClickValue>(
            GridCellEditorEventType.SetPointClickValue,
          ),
        )
        .subscribe(({ value }) => {
          onSetPointClickValue(value);
        }),
    );

    return () => {
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [cellEditorEvent$, onSetPointClickValue]);

  return { onStartPointClick, onStopPointClick };
}
