import classNames from 'classnames';
import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className
);

const LinkRenderer = (props: any) => {
  return (
    <a href={props.href} rel="noreferrer" target="_blank">
      {props.children}
    </a>
  );
};

interface Props {
  content: string;
  className?: string;
}

export const Markdown = ({ content, className }: Props) => {
  return (
    <MemoizedReactMarkdown
      className={classNames(className)}
      components={{ a: LinkRenderer }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </MemoizedReactMarkdown>
  );
};
