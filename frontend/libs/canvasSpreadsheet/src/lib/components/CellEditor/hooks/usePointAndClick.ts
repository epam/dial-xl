import { RefObject, useCallback, useContext, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';

import { GridApi, GridCallbacks } from '../../../types';
import { filterByTypeAndCast } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';
import {
  GridCellEditorEventSetPointClickValue,
  GridCellEditorEventType,
} from '../types';

type Props = {
  apiRef: RefObject<GridApi>;
  gridCallbacksRef: RefObject<GridCallbacks>;
};

export function usePointAndClick({ apiRef, gridCallbacksRef }: Props) {
  const { setFocus, setCode, codeValue, onCodeChange } =
    useContext(CellEditorContext);

  const cursorOffset = useRef<number>(0);
  const lastPointClickValue = useRef<string>('');
  const lastCodeEditorValue = useRef<string>('');

  const onStartPointClick = useCallback(
    (offset: number) => {
      cursorOffset.current = offset;
      gridCallbacksRef?.current?.onStartPointClick?.();
    },
    [gridCallbacksRef]
  );

  const onStopPointClick = useCallback(
    (offset: number) => {
      if (!apiRef.current) return;

      const isSameValue = codeValue.current === lastCodeEditorValue.current;

      const isOffsetChanged =
        cursorOffset.current + lastPointClickValue.current.length !== offset;

      if (isSameValue && !isOffsetChanged) {
        return;
      }

      lastPointClickValue.current = '';
      lastCodeEditorValue.current = '';
      cursorOffset.current = 0;

      apiRef.current.updateSelection(null, { silent: true });
      gridCallbacksRef?.current?.onStopPointClick?.();
    },
    [apiRef, codeValue, gridCallbacksRef]
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

      setCode.current?.(updatedValue);

      setTimeout(() => {
        setFocus.current?.();
        onCodeChange(updatedValue);
      }, 0);
    },
    [codeValue, onCodeChange, setCode, setFocus]
  );

  useEffect(() => {
    if (!apiRef.current) return;

    const api = apiRef.current;
    const subscriptions: Subscription[] = [];

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventSetPointClickValue>(
            GridCellEditorEventType.SetPointClickValue
          )
        )
        .subscribe(({ value }) => {
          onSetPointClickValue(value);
        })
    );

    return () => {
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [apiRef, onSetPointClickValue]);

  return { onStartPointClick, onStopPointClick };
}
