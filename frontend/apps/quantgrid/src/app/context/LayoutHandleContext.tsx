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
  const { children, events, index, hasSplitter } = props;
  const [state, setState] = useState({ events, index, hasSplitter });

  useEffect(() => {
    setState({ events, index, hasSplitter });
  }, [events, index, hasSplitter]);

  return (
    <HandleContext.Provider value={state}>{children}</HandleContext.Provider>
  );
}
