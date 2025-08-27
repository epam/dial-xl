import { MutableRefObject, useRef, useState } from 'react';

type StateFunc<T> = (currValue: T) => T;

export const useStateWithRef = <T>(
  initialValue: T
): [T, (arg: T | StateFunc<T>) => void, MutableRefObject<T>] => {
  const [value, _setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);

  const setValue = (arg: T | ((currValue: T) => T)) => {
    let res: T;
    if (typeof arg === 'function') {
      res = (arg as (currValue: T) => T)(valueRef.current);
    } else {
      res = arg;
    }
    valueRef.current = res;
    _setValue(res);
  };

  return [value, setValue, valueRef];
};
