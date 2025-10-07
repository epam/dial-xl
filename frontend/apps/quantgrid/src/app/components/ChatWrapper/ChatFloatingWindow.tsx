import { Tooltip } from 'antd';
import cx from 'classnames';
import { ResizeDirection } from 're-resizable';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DraggableData, DraggableEvent } from 'react-draggable';
import { Position, ResizableDelta, Rnd } from 'react-rnd';

import Icon from '@ant-design/icons';
import { getPx } from '@frontend/canvas-spreadsheet';
import {
  ArrowAltIcon,
  ArrowNarrowUp,
  CloseIcon,
  DialChatLogoIcon,
} from '@frontend/common';

import { AppContext, ChatOverlayContext } from '../../context';

const chatWindowDragHandleClass = 'chat-window-drag-handle';
const positionOffset = 20;

type ChatWindowOptions = {
  x: number;
  y: number;
  width: string;
  height: string;
};

const defaultChatWindowOptions: ChatWindowOptions = {
  x: 0,
  y: 0,
  width: '360px',
  height: '640px',
};

const maximizedChatSize = '100%';
const minSize = '200px';

export function ChatFloatingWindow() {
  const { toggleChatWindowPlacement, toggleChat, isChatOpen } =
    useContext(AppContext);
  const { attachOverlay } = useContext(ChatOverlayContext);

  const [isInitialized, setIsInitialized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rndOptions, setRndOptions] = useState<ChatWindowOptions>(
    defaultChatWindowOptions
  );

  const toggleExpanded = useCallback(() => {
    const { height, width } = defaultChatWindowOptions;

    setRndOptions(() => ({
      x: expanded ? getChatPositionX(width) : 0,
      y: expanded ? getChatPositionY(height) : 0,
      width: expanded ? width : maximizedChatSize,
      height: expanded ? height : maximizedChatSize,
    }));

    setExpanded((prev) => !prev);
  }, [expanded]);

  const handleWindowResize = useCallback(() => {
    const updatedRndOptions: Partial<typeof rndOptions> = {};
    const { x, y, width, height } = rndOptions;
    const { innerWidth, innerHeight } = window;
    const parsedWidth = parseFloat(width);
    const parsedHeight = parseFloat(height);
    const shouldUpdateX = x + parsedWidth + positionOffset > innerWidth;
    const shouldUpdateY = y + parsedHeight + positionOffset > innerHeight;

    if (shouldUpdateX) {
      const updatedX = Math.max(0, innerWidth - parsedWidth - positionOffset);
      updatedRndOptions.x = updatedX;
      updatedRndOptions.width = getPx(Math.max(0, innerWidth - updatedX));
    }

    if (shouldUpdateY) {
      const updatedY = Math.max(0, innerHeight - parsedHeight - positionOffset);
      updatedRndOptions.y = updatedY;
      updatedRndOptions.height = getPx(Math.max(0, innerHeight - updatedY));
    }

    if (Object.keys(updatedRndOptions).length > 0) {
      setRndOptions((prev) => ({ ...prev, ...updatedRndOptions }));
    }
  }, [rndOptions]);

  const handleDragStop = useCallback(
    (e: DraggableEvent, data: DraggableData) => {
      document.body.style.pointerEvents = 'auto';
      const x = Math.max(0, data.x);
      const y = Math.max(0, data.y);
      setRndOptions({ ...rndOptions, x, y });
    },
    [rndOptions]
  );

  const handleResizeStop = useCallback(
    (
      e: MouseEvent | TouchEvent,
      dir: ResizeDirection,
      ref: HTMLElement,
      delta: ResizableDelta,
      position: Position
    ) => {
      e.stopPropagation();

      setRndOptions({
        width: ref.style.width,
        height: ref.style.height,
        ...position,
      });
    },
    []
  );

  const isChatHidden = useMemo(
    () => !isChatOpen || (isChatOpen && !isInitialized),
    [isChatOpen, isInitialized]
  );

  useEffect(() => {
    if (isInitialized || !isChatOpen) return;

    const initialHeight = getPx(
      Math.min(window.innerHeight, parseFloat(rndOptions.height))
    );
    const initialWidth = getPx(
      Math.min(window.innerWidth, parseFloat(rndOptions.width))
    );

    setRndOptions((prevState: any) => ({
      ...prevState,
      x: getChatPositionX(initialWidth),
      y: getChatPositionY(initialHeight),
      height: initialHeight,
      width: initialWidth,
    }));
    setIsInitialized(true);
  }, [isInitialized, isChatOpen, rndOptions]);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleWindowResize]);

  return (
    <Rnd
      bounds="body"
      className={cx('fixed! z-1000', {
        hidden: isChatHidden,
        'pointer-events-none': !isChatOpen,
      })}
      dragHandleClassName={chatWindowDragHandleClass}
      enableResizing={true}
      minHeight={minSize}
      minWidth={minSize}
      position={{ x: rndOptions.x, y: rndOptions.y }}
      size={{ width: rndOptions.width, height: rndOptions.height }}
      onDragStart={() => {
        document.body.style.pointerEvents = 'none';
      }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
    >
      <div
        className={cx(
          'z-1001 flex flex-col h-full w-full border border-stroke-primary shadow-[0_2px_4px_1px_rgba(9,13,19,0.25)] bg-bg-layer-2',
          {
            hidden: isChatHidden,
          }
        )}
        id="dialChatWindow"
      >
        <div className="flex items-center justify-between h-5 w-full bg-bg-layer-2 border-b border-b-stroke-tertiary">
          <div
            className={cx(
              'flex items-center h-full w-full cursor-move pl-2 chat-window-drag-handle',
              chatWindowDragHandleClass
            )}
          >
            <span className="text-[10px] leading-[10px] text-text-secondary tracking-[0.6px] font-bold uppercase">
              DIAL Chat
            </span>
          </div>
          <Tooltip placement="top" title="Move Chat to Panel" destroyOnHidden>
            <Icon
              className="shrink-0 w-4 text-text-secondary mr-2"
              component={() => <DialChatLogoIcon />}
              onClick={toggleChatWindowPlacement}
            />
          </Tooltip>
          <Tooltip
            placement="top"
            title={expanded ? 'Restore Chat' : 'Expand Chat'}
            destroyOnHidden
          >
            <Icon
              className={cx('shrink-0 w-[14px] text-text-secondary mr-2', {
                'transform rotate-225': expanded,
                'transform rotate-45': !expanded,
              })}
              component={() =>
                expanded ? <ArrowNarrowUp /> : <ArrowAltIcon />
              }
              onClick={toggleExpanded}
            />
          </Tooltip>
          <Tooltip placement="top" title="Close Chat" destroyOnHidden>
            <Icon
              className="shrink-0 w-[14px] text-text-secondary mr-2"
              component={() => <CloseIcon />}
              onClick={toggleChat}
            />
          </Tooltip>
        </div>
        <div
          className={cx('h-full w-full')}
          ref={(el) => attachOverlay(el)}
        ></div>
      </div>
    </Rnd>
  );
}

function getChatPositionX(width: string) {
  return Math.max(0, window.innerWidth - parseInt(width) - positionOffset);
}

function getChatPositionY(height: string) {
  return Math.max(0, window.innerHeight - parseInt(height) - positionOffset);
}
