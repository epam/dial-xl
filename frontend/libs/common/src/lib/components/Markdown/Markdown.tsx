import classNames from 'classnames';
import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
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
    <div className={classNames(className)}>
      <MemoizedReactMarkdown
        components={{ a: LinkRenderer }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </MemoizedReactMarkdown>
    </div>
  );
};
