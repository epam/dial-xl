import cx from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';
import { DraggableData, DraggableEvent } from 'react-draggable';
import { Rnd } from 'react-rnd';

import Icon from '@ant-design/icons';
import { DialChatLogoIconColored, DragIcon } from '@frontend/common';

import { AppContext } from '../../context';

export const chatButtonId = 'toggleDialChatButton';
const buttonDragHandleClass = 'chat-button-drag-handle';
const defaultButtonOffsetX = 100;
const defaultButtonOffsetY = 100;

type ChatButtonOptions = {
  x: number;
  y: number;
};

export function ChatButton() {
  const { toggleChat, isChatOpen } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInit, setIsInit] = useState(false);
  const [rndOptions, setRndOptions] = useState<ChatButtonOptions>({
    x: 0,
    y: 0,
  });
  const [ratioPos, setRatioPos] = useState({ rx: 0, ry: 0 });

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    document.body.style.pointerEvents = 'none';
  }, []);

  const handleDragStop = useCallback(
    (e: DraggableEvent, data: DraggableData) => {
      const { x, y } = data;
      setRndOptions({ x, y });
      setIsDragging(false);
      setRatioPos(getRatioPos());
      document.body.style.pointerEvents = 'auto';
    },
    []
  );

  const handleWindowResize = useCallback(() => {
    setRndOptions((prev) => ({
      ...prev,
      x: Math.min(
        ratioPos.rx * window.innerWidth,
        window.innerWidth - defaultButtonOffsetX
      ),
      y: Math.min(
        ratioPos.ry * window.innerHeight,
        window.innerHeight - defaultButtonOffsetY
      ),
    }));
  }, [ratioPos]);

  useEffect(() => {
    setRndOptions({
      x: window.innerWidth - defaultButtonOffsetX,
      y: window.innerHeight - defaultButtonOffsetY,
    });
    setIsInit(true);
    setRatioPos(getRatioPos());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleWindowResize]);

  if (!isInit || isChatOpen) return null;

  return (
    <Rnd
      bounds="body"
      className={cx('fixed! z-1000', {
        hidden: isChatOpen,
      })}
      dragHandleClassName={buttonDragHandleClass}
      enableResizing={false}
      position={{ x: rndOptions.x, y: rndOptions.y }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
    >
      <div
        className="flex flex-col w-[65px] h-[80px] relative"
        onMouseLeave={() => setIsHovered(false)}
        onMouseOver={() => setIsHovered(true)}
      >
        <div
          className={cx(
            'flex items-center cursor-move w-full absolute bg-bg-inverted px-[6px] py-1 rounded-[3px]',
            buttonDragHandleClass,
            { hidden: !isHovered && !isDragging }
          )}
        >
          <Icon
            className="w-[18px] text-text-inverted mr-1"
            component={() => <DragIcon />}
          />

          <span className="text-[13px] leading-[13px] text-text-inverted">
            Drag
          </span>
        </div>
        <Icon
          className="w-[50px] absolute top-[30px] left-2"
          component={() => <DialChatLogoIconColored />}
          id={chatButtonId}
          onClick={toggleChat}
        />
      </div>
    </Rnd>
  );
}

function getRatioPos(): { rx: number; ry: number } {
  return {
    rx: (window.innerWidth - defaultButtonOffsetX) / window.innerWidth,
    ry: (window.innerHeight - defaultButtonOffsetY) / window.innerHeight,
  };
}
