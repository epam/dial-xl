import { ComponentElement, createContext } from 'react';
import { ReflexElement, ReflexElementProps } from 'react-reflex';

export type HandleContextProps = {
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
