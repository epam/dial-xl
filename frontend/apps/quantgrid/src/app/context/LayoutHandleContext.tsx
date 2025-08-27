import {
  ComponentElement,
  createContext,
  PropsWithChildren,
  useEffect,
  useState,
} from 'react';
import { ReflexElement, ReflexElementProps } from 'react-reflex';

type HandleContextProps = {
  index?: number;
  events?: unknown;
  hasSplitter: boolean;
};

export type HandlerProps = {
  domElement: Element | Text;
  component: ComponentElement<ReflexElementProps, ReflexElement>;
};

export const HandleContext = createContext<HandleContextProps>(
  null as unknown as HandleContextProps
);

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
