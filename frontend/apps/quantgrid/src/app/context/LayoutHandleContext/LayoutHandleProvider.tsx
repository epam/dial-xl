import { PropsWithChildren, useEffect, useState } from 'react';

import { HandleContext, HandleContextProps } from './LayoutHandleContext';

export function HandleProvider(props: PropsWithChildren<HandleContextProps>) {
  const [state, setState] = useState({
    events: props.events,
    index: props.index,
    hasSplitter: props.hasSplitter,
  });

  useEffect(() => {
    setState({
      events: props.events,
      index: props.index,
      hasSplitter: props.hasSplitter,
    });
  }, [props.events, props.index, props.hasSplitter]);

  return (
    <HandleContext.Provider value={state}>
      {props.children}
    </HandleContext.Provider>
  );
}
