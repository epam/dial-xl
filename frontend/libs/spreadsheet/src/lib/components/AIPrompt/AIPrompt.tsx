import { Button, Modal, Popover, Tooltip } from 'antd';
import { Input } from 'antd';
import classNames from 'classnames';
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Icon from '@ant-design/icons';
import { Message, Role } from '@epam/ai-dial-overlay';
import {
  ExclamationCircleIcon,
  getDataScroller,
  getSuggestions,
  Markdown,
  MinimizeIcon,
  primaryButtonClasses,
  RefreshIcon,
  SendIcon,
  shouldStopPropagation,
  SparklesIcon,
  StopFilledIcon,
  SystemMessageParsedContent,
  useClickOutside,
} from '@frontend/common';

import { AIPromptWrapperId, gridDataContainerClass } from '../../constants';
import { defaults } from '../../defaults';
import {
  EventTypeExpandAIPrompt,
  EventTypeOpenAIPrompt,
  filterByTypeAndCast,
  Grid,
  GridEvent,
  GridSelection,
} from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';
import {
  focusSpreadsheet,
  getCellElement,
  getGridRoot,
  getPx,
} from '../../utils';
import { useAIPromptRequests } from './useAIPromptRequest';
import { useAIPromptSuggestions } from './useAIPromptSuggestions';

const defaultPosition = { x: 0, y: 0 };
const aiPromptWidth = 400;

const { TextArea } = Input;

type Props = {
  systemMessageContent: SystemMessageParsedContent | undefined;
  gridServiceRef: MutableRefObject<GridService | null>;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
  zoom?: number;
  currentSheetName: string | null;
};

export function AIPrompt({
  systemMessageContent,
  gridServiceRef,
  gridCallbacksRef,
  api,
  currentSheetName,
  zoom = 1,
}: Props) {
  const clickRef = useRef<HTMLDivElement>(null);
  const promptAreaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isOpened, setIsOpened] = useState(false);
  const [isWaitForAIPromptOpened, setIsWaitForAIPromptOpened] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [position, setPosition] = useState(defaultPosition);
  const [initialScrollLeft, setInitialScrollLeft] = useState(0);
  const [initialScrollTop, setInitialScrollTop] = useState(0);

  const [prompt, setPrompt] = useState<string>('');
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [sheetSuggestionsName, setSheetSuggestionsName] = useState('');
  const [isSuggestionReview, setIsSuggestionReview] = useState(false);
  const [assistantTextAnswer, setAssistantTextAnswer] = useState('');
  const [previousPrompts, setPreviousPrompts] = useState<string[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<
    React.Key | null | undefined
  >(undefined);
  const [loadingLabel, setLoadingLabel] = useState('Generating answer');
  const [maxHeight, setMaxHeight] = useState(0);

  const systemPrompt = useMemo(() => {
    return systemMessageContent
      ? JSON.stringify({
          ...systemMessageContent,
          summarize: false,
        } as SystemMessageParsedContent)
      : '';
  }, [systemMessageContent]);

  const handleUpdatePrompt = useCallback(
    (prompt: string) => {
      if (!isOpened || prompt === undefined) return;

      setPrompt(prompt);
      promptAreaRef.current?.focus();
    },
    [isOpened]
  );

  const onResponseUpdate = useCallback((currentMessage: Message) => {
    const stages = currentMessage.custom_content?.stages;

    if (!stages?.length) return;

    const lastStage = stages[stages.length - 1];

    setLoadingLabel(lastStage.name);

    setAssistantTextAnswer(currentMessage.content);
  }, []);

  const { isLoading, isError, sendRequest, stopRequest, resetRequestResults } =
    useAIPromptRequests({
      systemPrompt,
      onResponseUpdate,
    });

  const hide = useCallback(() => {
    if (!isOpened) return;

    setIsOpened(false);
    setPosition(defaultPosition);
    setInitialScrollLeft(0);
    setInitialScrollTop(0);
    setIsSuggestionReview(false);
    setAssistantTextAnswer('');
    setSelectedPromptKey(undefined);
    setPrompt('');
    resetRequestResults();
    setSheetSuggestionsName('');

    focusSpreadsheet();
  }, [isOpened, resetRequestResults]);

  const handleCollapseAIPrompt = useCallback(() => {
    setIsCollapsed(true);
    gridCallbacksRef.current.onAIPendingBanner?.(true);
  }, [gridCallbacksRef]);

  const onClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        (!isSuggestionReview &&
          !assistantTextAnswer &&
          !isLoading &&
          !isError) ||
        isWaitForAIPromptOpened
      )
        return;

      if (isLoading) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        setIsWaitForAIPromptOpened(true);
      } else if (assistantTextAnswer || isSuggestionReview) {
        handleCollapseAIPrompt();
      } else if (!isError) {
        hide();
      }
    },
    [
      assistantTextAnswer,
      handleCollapseAIPrompt,
      hide,
      isError,
      isLoading,
      isSuggestionReview,
      isWaitForAIPromptOpened,
    ]
  );

  useClickOutside(clickRef, onClickOutside, [
    'click',
    'contextmenu',
    'dblclick',
    'mousedown',
  ]);

  const handleKeep = useCallback(() => {
    gridCallbacksRef.current.onAIPendingChanges?.(false);
    hide();
  }, [gridCallbacksRef, hide]);

  const handleDiscard = useCallback(() => {
    if (!isSuggestionReview) return;

    gridCallbacksRef.current.onUndo?.();
    gridCallbacksRef.current.onAIPendingChanges?.(false);

    hide();
  }, [gridCallbacksRef, hide, isSuggestionReview]);

  const handleTryAgain = useCallback(() => {
    if (!isSuggestionReview && !assistantTextAnswer && !isError) return;

    setAssistantTextAnswer('');
    resetRequestResults();

    if (isSuggestionReview) {
      setIsSuggestionReview(false);
      gridCallbacksRef.current.onUndo?.();
      gridCallbacksRef.current.onAIPendingChanges?.(false);
    }

    setTimeout(() => {
      promptAreaRef.current?.focus({
        cursor: 'end',
      } as any);
    }, 0);
  }, [
    assistantTextAnswer,
    gridCallbacksRef,
    isError,
    isSuggestionReview,
    resetRequestResults,
  ]);

  const handleNewMessage = useCallback(() => {
    if (!isSuggestionReview && !assistantTextAnswer && !isError) return;

    setAssistantTextAnswer('');
    resetRequestResults();
    setPrompt('');

    gridCallbacksRef.current.onAIPendingChanges?.(false);

    setTimeout(() => {
      promptAreaRef.current?.focus({
        cursor: 'end',
      } as any);
    }, 0);
  }, [
    assistantTextAnswer,
    gridCallbacksRef,
    isError,
    isSuggestionReview,
    resetRequestResults,
  ]);

  const show = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const {
        top,
        left,
        width: rootWidth,
        height: rootHeight,
      } = getGridRoot().getBoundingClientRect();
      const gridDataScroller = getDataScroller();

      setIsOpened(true);
      promptAreaRef.current?.focus();

      // Cover case when cell already outside of screen - we don't need to move ai prompt in such case
      const isCellInXViewport = x < left + rootWidth && x > left;
      if (!isCellInXViewport) return;

      const desiredX = x - Math.floor((aiPromptWidth - width) / 2) - left;
      const limitedX = Math.max(desiredX, defaults.rowNumber.stub.width);
      const maxX = rootWidth - aiPromptWidth - 10;

      const newX = Math.min(limitedX, maxX);
      const newY = Math.max(y + height + 2 - top, 0);

      setPosition({
        x: newX,
        y: newY,
      });
      setInitialScrollLeft(gridDataScroller.scrollLeft);
      setInitialScrollTop(gridDataScroller.scrollTop);
      setMaxHeight(Math.min(Math.max(rootHeight * 0.4, 300), 600));
    },
    [setIsOpened, setPosition]
  );

  const showAIPromptExplicitly = useCallback(
    (col: number, row: number) => {
      const cellElement = getCellElement(col, row);

      if (!cellElement) return;

      const { x, y, height, width } = cellElement.getBoundingClientRect();

      show(x, y, width, height);

      setTimeout(() => {
        promptAreaRef.current?.focus();
      }, 0);
    },
    [show]
  );

  const handleSendAIPrompt = useCallback(async () => {
    if (!api || !prompt) return;

    setAssistantTextAnswer('');
    setIsSuggestionReview(false);
    resetRequestResults();

    setPreviousPrompts((prev) =>
      [prompt]
        .concat((prev ?? []).filter((item) => item !== prompt))
        .slice(0, 5)
    );

    const resultMessage = await sendRequest({
      userMessage: {
        content: prompt,
        role: Role.User,
      },
    });

    if (!resultMessage) return;

    const { suggestions } = getSuggestions([resultMessage]);

    if (suggestions?.length) {
      setSheetSuggestionsName(currentSheetName ?? '');
      gridCallbacksRef.current.onAIPendingChanges?.(true);
      setIsSuggestionReview(true);
      gridCallbacksRef.current.onApplySuggestion?.(suggestions);
    }
  }, [
    api,
    currentSheetName,
    gridCallbacksRef,
    prompt,
    resetRequestResults,
    sendRequest,
  ]);

  const handleTextAreaKeydown = useCallback(
    (event: React.KeyboardEvent) => {
      const isEnter = event.key === 'Enter';

      if (!isEnter) return;

      event.preventDefault();
      handleSendAIPrompt();
    },
    [handleSendAIPrompt]
  );

  const handleAddNote = useCallback(() => {
    if (!assistantTextAnswer || !selection) return;

    const cell = api?.getCell(selection.startCol, selection.startRow);

    if (!cell?.table?.tableName || !cell.field?.fieldName) return;

    gridCallbacksRef.current?.onUpdateNote?.(
      cell.table.tableName,
      cell.field.fieldName,
      assistantTextAnswer
    );
    gridCallbacksRef.current.onAIPendingChanges?.(false);

    hide();
  }, [api, assistantTextAnswer, gridCallbacksRef, hide, selection]);

  const { contextMenuItems } = useAIPromptSuggestions({
    api,
    selection,
    previousPrompts,
    isSuggestionReview,
    isTextAnswer: !!assistantTextAnswer,
    isError: isError,
    isLoading,
    onAccept: handleKeep,
    onDiscard: handleDiscard,
    onHide: hide,
    onSelectPrompt: handleUpdatePrompt,
    onTryAgain: handleTryAgain,
    onNewMessage: handleNewMessage,
    onAddNote: handleAddNote,
  });

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpened) return;

      const isEscape = event.key === 'Escape';
      const isArrowDown = event.key === 'ArrowDown';
      const isArrowUp = event.key === 'ArrowUp';
      const isEnter = event.key === 'Enter';

      if (isOpened && shouldStopPropagation(event)) {
        event.stopPropagation();
      }

      if (
        (!isEscape && !isArrowDown && !isArrowUp && !isEnter) ||
        isSuggestionReview ||
        isLoading
      )
        return;

      if (isEscape) {
        hide();

        return;
      }

      if (isError || assistantTextAnswer) return;

      event.preventDefault();
      event.stopPropagation();

      const filteredItems = contextMenuItems
        .map((section) => section.items)
        .flat();
      const prevIndex = filteredItems.findIndex(
        (item) => item.key === selectedPromptKey
      );
      if (isArrowDown) {
        setSelectedPromptKey(
          prevIndex === -1
            ? filteredItems.at(0)?.key
            : prevIndex === filteredItems.length - 1
            ? filteredItems.at(0)?.key
            : filteredItems.at(prevIndex + 1)?.key
        );

        return;
      }
      if (isArrowUp) {
        setSelectedPromptKey(
          prevIndex === -1
            ? filteredItems.at(0)?.key
            : prevIndex === 0
            ? filteredItems.at(filteredItems.length - 1)?.key
            : filteredItems.at(prevIndex - 1)?.key
        );

        return;
      }
    },
    [
      assistantTextAnswer,
      contextMenuItems,
      hide,
      isError,
      isLoading,
      isOpened,
      isSuggestionReview,
      selectedPromptKey,
    ]
  );

  const handleExpandCollapseAIPrompt = useCallback(() => {
    if (!selection) return;

    gridCallbacksRef.current.onOpenSheet?.({ sheetName: sheetSuggestionsName });
    gridCallbacksRef.current.onAIPendingBanner?.(true);

    api?.updateSelection(selection);

    setTimeout(() => {
      showAIPromptExplicitly(selection.startCol, selection.endRow);
      setIsCollapsed(false);
    }, 100);
  }, [
    api,
    gridCallbacksRef,
    selection,
    sheetSuggestionsName,
    showAIPromptExplicitly,
  ]);

  useEffect(() => {
    if (selectedPromptKey !== undefined) {
      const filteredItems = contextMenuItems
        .map((section) => section.items)
        .flat();
      const item = filteredItems.find((item) => item.key === selectedPromptKey);

      if (item?.isPrompt) {
        item?.onClick?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPromptKey]);

  useEffect(() => {
    if (!selection || !isOpened) return;

    if (!isSuggestionReview && !assistantTextAnswer && !isError && !isLoading) {
      hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  useEffect(() => {
    if (!api) return;

    const openSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeOpenAIPrompt>(GridEvent.openAIPrompt))
      .subscribe(({ col, row }) => {
        if (!isOpened) {
          showAIPromptExplicitly(col, row);
        }
      });
    const expandSubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeExpandAIPrompt>(GridEvent.expandAIPrompt)
      )
      .subscribe(() => {
        if (isCollapsed) {
          handleExpandCollapseAIPrompt();
        }
      });

    const selectionSubscription = api.selection$.subscribe(
      (value: GridSelection | null) => {
        if (
          !isSuggestionReview &&
          !assistantTextAnswer &&
          !isLoading &&
          !isError &&
          (value?.endCol !== selection?.endCol ||
            value?.startCol !== selection?.startCol ||
            value?.startRow !== selection?.startRow ||
            value?.endRow !== selection?.endRow)
        ) {
          setSelection(value);
        }
      }
    );

    return () => {
      [openSubscription, selectionSubscription, expandSubscription].forEach(
        (s) => s.unsubscribe()
      );
    };
  }, [
    api,
    assistantTextAnswer,
    handleExpandCollapseAIPrompt,
    isCollapsed,
    isError,
    isLoading,
    isOpened,
    isSuggestionReview,
    selection?.endCol,
    selection?.endRow,
    selection?.startCol,
    selection?.startRow,
    showAIPromptExplicitly,
  ]);

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    if (!dataContainer) return;

    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  useEffect(() => {
    if (previousPrompts.length > 0) {
      localStorage.setItem(
        'inlinePromptsHistory',
        JSON.stringify(previousPrompts)
      );
    }
  }, [previousPrompts]);

  useEffect(() => {
    try {
      const previousPrompts = localStorage.getItem('inlinePromptsHistory');

      setPreviousPrompts(previousPrompts ? JSON.parse(previousPrompts) : []);
    } catch {
      // Case when localstorage has broken prompts
      setPreviousPrompts([]);
    }
  }, []);

  if (!isOpened) return null;

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-[305]"
      ref={clickRef}
    >
      {!isCollapsed && (
        <div
          className="pointer-events-auto rounded-md break-words z-[600] absolute transition-opacity flex gap-1"
          data-initial-scroll-left={initialScrollLeft}
          data-initial-scroll-top={initialScrollTop}
          data-left={position.x}
          data-top={position.y}
          id={AIPromptWrapperId}
          style={{
            top: position.y,
            left: position.x,
            fontSize: getPx(14 * zoom),
          }}
        >
          <Popover
            arrow={false}
            className="rounded"
            content={
              <div
                className="flex flex-col text-textPrimary"
                ref={contentRef}
                style={{ width: `${aiPromptWidth}px` }}
              >
                <div
                  className="flex gap-2 px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-block h-[18px] w-[18px]">
                    <Icon
                      className="text-bgAccentTertiary h-[18px] w-[18px] shrink-0"
                      component={() => <SparklesIcon />}
                    ></Icon>
                  </div>
                  {!isSuggestionReview &&
                  !assistantTextAnswer &&
                  !isError &&
                  !isLoading ? (
                    <TextArea
                      className="grow text-sm text-textPrimary !bg-bgLayer0 !leading-tight !border-none !outline-none focus-within:outline-none focus-within:!shadow-none focus:!shadow-none p-0 !min-h-[18px]"
                      placeholder="Ask AI anything"
                      ref={promptAreaRef}
                      size="small"
                      value={prompt}
                      autoSize
                      onChange={(e) => handleUpdatePrompt(e.target.value)}
                      onFocus={() => {
                        setSelectedPromptKey(undefined);
                      }}
                      onKeyDown={handleTextAreaKeydown}
                    />
                  ) : (
                    <div
                      className="flex flex-col grow gap-2"
                      style={{
                        maxHeight: `${maxHeight}px`,
                      }}
                    >
                      {isLoading ? (
                        <div className="animate-fast-pulse leading-tight">
                          {loadingLabel}...
                        </div>
                      ) : (
                        <div className="text-textSecondary leading-tight">
                          {prompt}
                        </div>
                      )}
                      {!isError && assistantTextAnswer && (
                        <div className="overflow-auto thin-scrollbar">
                          <Markdown
                            className="prose prose-sm min-w-full prose-a:text-textAccentSecondary prose-a:no-underline hover:prose-a:underline"
                            content={assistantTextAnswer}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!isSuggestionReview && (
                    <div className="inline-block">
                      <button
                        className="flex hover:text-textAccentPrimary disabled:text-textSecondary h-[18px] w-[18px]"
                        disabled={!prompt}
                        onClick={() => {
                          if (isLoading) {
                            stopRequest();
                          } else {
                            handleSendAIPrompt();
                          }
                        }}
                      >
                        {isLoading ? (
                          <Icon
                            className="h-[18px] w-[18px]"
                            component={() => <StopFilledIcon />}
                          ></Icon>
                        ) : isError ? (
                          <Icon
                            className="h-[18px] w-[18px] text-textError"
                            component={() => <RefreshIcon />}
                          ></Icon>
                        ) : (
                          <Icon
                            className="h-[18px] w-[18px]"
                            component={() => <SendIcon />}
                          ></Icon>
                        )}
                      </button>
                    </div>
                  )}
                  {isSuggestionReview && (
                    <div className="inline-block">
                      <button
                        className="flex text-textSecondary hover:text-textAccentPrimary h-[18px] w-[18px]"
                        onClick={() => {
                          handleCollapseAIPrompt();
                        }}
                      >
                        <Icon
                          className="h-[18px] w-[18px]"
                          component={() => <MinimizeIcon />}
                        ></Icon>
                      </button>
                    </div>
                  )}
                </div>

                {isError && (
                  <div className="flex gap-2 items-center text-textError bg-bgError px-3 py-1.5">
                    <Icon
                      className="h-[18px] w-[18px]"
                      component={() => <ExclamationCircleIcon />}
                    ></Icon>
                    <span>
                      Error happened during answering. Please try again.
                    </span>
                  </div>
                )}

                <div className="flex flex-col">
                  {contextMenuItems.map((section) =>
                    section.items.length > 0 ? (
                      <div
                        className="flex flex-col border-t border-strokePrimary"
                        key={section.section}
                      >
                        <span className="px-3 uppercase text-[10px] text-textSecondary py-1 font-bold">
                          {section.section}
                        </span>
                        <div className="flex flex-col">
                          {section.items.map((item) => (
                            <button
                              className={classNames(
                                'flex px-3 gap-2 truncate items-center py-1 hover:bg-bgAccentPrimaryAlpha',
                                selectedPromptKey === item.key &&
                                  'bg-bgAccentPrimaryAlpha2'
                              )}
                              key={item.key}
                              onClick={() => item.onClick?.()}
                            >
                              <span className="shrink-0 flex items-center">
                                {item.icon}
                              </span>
                              <Tooltip title={item.label}>
                                <span className="truncate">{item.label}</span>
                              </Tooltip>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            }
            getPopupContainer={(triggerNode) =>
              triggerNode.parentElement as any
            }
            open={isOpened}
            placement="bottomLeft"
          />

          <Modal
            className="max-w-[330px]"
            destroyOnClose={true}
            footer={null}
            open={isWaitForAIPromptOpened}
            title="Please wait."
            onCancel={() => setIsWaitForAIPromptOpened(false)}
          >
            <div className="flex flex-col gap-4">
              <div className="text-textSecondary">
                Please wait till AI end generating or stop generating manually.
              </div>
              <div className="flex gap-1 justify-end">
                <Button
                  className={primaryButtonClasses}
                  autoFocus
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWaitForAIPromptOpened(false);
                  }}
                >
                  OK
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
