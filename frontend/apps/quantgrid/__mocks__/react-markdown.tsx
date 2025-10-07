/* eslint-disable react/prop-types */
import React, { PropsWithChildren } from 'react';

export interface Options {}

const ReactMarkdown = ({ children }: PropsWithChildren) => <>{children}</>;

export default ReactMarkdown;
export { ReactMarkdown };
