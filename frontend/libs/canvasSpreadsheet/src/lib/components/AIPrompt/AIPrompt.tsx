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
  getSuggestions,
  Markdown,
  MinimizeIcon,
  primaryButtonClasses,
  RefreshIcon,
  SendIcon,
  Shortcut,
  shortcutApi,
  shouldStopPropagation,
  SparklesIcon,
  StopFilledIcon,
  SystemMessageParsedContent,
  useClickOutside,
} from '@frontend/common';

import { defaultGridSizes } from '../../constants';
import { Edges, GridApi, GridCallbacks } from '../../types';
import { filterByTypeAndCast, focusSpreadsheet, getPx } from '../../utils';
import {
  EventTypeExpandAIPrompt,
  EventTypeOpenAIPrompt,
  GridEvent,
} from '../GridApiWrapper';
import { useAIPromptRequests } from './useAIPromptRequest';
import { useAIPromptSuggestions } from './useAIPromptSuggestions';

const defaultPosition = { x: 0, y: 0 };
const aiPromptWidth = 400;

const { TextArea } = Input;

type Props = {
  systemMessageContent: SystemMessageParsedContent | undefined;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: GridApi | null;
  zoom?: number;
  currentSheetName: string | null;
};

export function AIPrompt({
  systemMessageContent,
  gridCallbacksRef,
  currentSheetName,
  api,
  zoom = 1,
}: Props) {
  const clickRef = useRef<HTMLDivElement>(null);
  const promptAreaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isOpened, setIsOpened] = useState(false);
  const [isWaitForAIPromptOpened, setIsWaitForAIPromptOpened] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [position, setPosition] = useState(defaultPosition);
  const [initialPosition, setInitialPosition] = useState(defaultPosition);
  const [initialScrollLeft, setInitialScrollLeft] = useState(0);
  const [initialScrollTop, setInitialScrollTop] = useState(0);

  const [prompt, setPrompt] = useState<string>('');
  const [selection, setSelection] = useState<Edges | null>(null);
  const [sheetSuggestionsName, setSheetSuggestionsName] = useState('');
  const [isSuggestionReview, setIsSuggestionReview] = useState(false);
  const [assistantTextAnswer, setAssistantTextAnswer] = useState('');
  const [previousPrompts, setPreviousPrompts] = useState<string[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<
    React.Key | null | undefined
  >(undefined);
  const [loadingLabel, setLoadingLabel] = useState('Generating answer');
  const [maxHeight, setMaxHeight] = useState(0);
  const [responseId, setResponseId] = useState<string>();
  const [selectionEdges, setSelectionEdges] = useState<Edges | null>(null);

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

  const {
    isLoading,
    isError,
    sendRequest,
    stopRequest,
    resetRequestResults,
    sendLike,
    sendDislike,
  } = useAIPromptRequests({
    systemPrompt,
    onResponseUpdate,
  });

  const hide = useCallback(() => {
    if (!isOpened) return;

    setIsOpened(false);
    setPosition(defaultPosition);
    setInitialPosition(defaultPosition);
    setInitialScrollLeft(0);
    setInitialScrollTop(0);
    setIsSuggestionReview(false);
    setAssistantTextAnswer('');
    setSelectedPromptKey(undefined);
    setPrompt('');
    setSheetSuggestionsName('');

    resetRequestResults();

    focusSpreadsheet();
  }, [isOpened, resetRequestResults]);

  const handleCollapseAIPrompt = useCallback(() => {
    if (isCollapsed) return;

    setIsCollapsed(true);
    gridCallbacksRef.current.onAIPendingBanner?.(true);
  }, [gridCallbacksRef, isCollapsed]);

  const onClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        (!isSuggestionReview &&
          !assistantTextAnswer &&
          !isLoading &&
          !isError) ||
        isCollapsed ||
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
      isCollapsed,
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
    sendLike(responseId);
    gridCallbacksRef.current.onAIPendingChanges?.(false);
    gridCallbacksRef.current.onAIPendingBanner?.(false);

    hide();
  }, [gridCallbacksRef, hide, responseId, sendLike]);

  const handleDiscard = useCallback(() => {
    if (!isSuggestionReview) return;

    sendDislike(responseId);
    gridCallbacksRef.current.onUndo?.();
    gridCallbacksRef.current.onAIPendingChanges?.(false);
    gridCallbacksRef.current.onAIPendingBanner?.(false);
    hide();
  }, [gridCallbacksRef, hide, isSuggestionReview, responseId, sendDislike]);

  const handleTryAgain = useCallback(() => {
    if (!isSuggestionReview && !assistantTextAnswer && !isError) return;

    setAssistantTextAnswer('');
    resetRequestResults();

    if (isSuggestionReview) {
      setIsSuggestionReview(false);
      sendDislike(responseId);
      gridCallbacksRef.current.onUndo?.();
      gridCallbacksRef.current.onAIPendingChanges?.(false);
      gridCallbacksRef.current.onAIPendingBanner?.(false);
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
    responseId,
    sendDislike,
  ]);

  const handleNewMessage = useCallback(() => {
    if (!isSuggestionReview && !assistantTextAnswer && !isError) return;

    setAssistantTextAnswer('');
    resetRequestResults();
    setPrompt('');
    gridCallbacksRef.current.onAIPendingChanges?.(false);
    gridCallbacksRef.current.onAIPendingBanner?.(false);

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
      if (!api) return;

      const {
        x1: left,
        x2: right,
        y1: top,
        y2: bottom,
      } = api.getViewportCoords();
      const rootWidth = right - left;
      const rootHeight = bottom - top;

      setIsOpened(true);
      promptAreaRef.current?.focus();

      // Cover case when cell already outside of screen - we don't need to move ai prompt in such case
      const isCellInXViewport = x > 0 && x < rootWidth;
      const isCellInYViewport = y > 0 && y < rootHeight;
      if (!isCellInXViewport || !isCellInYViewport) return;

      const desiredX = x - Math.floor((aiPromptWidth - width) / 2);
      const limitedX = Math.max(desiredX, defaultGridSizes.rowNumber.width);
      const maxX = rootWidth - aiPromptWidth - 10;

      const newX = Math.min(limitedX, maxX);
      const newY = Math.max(y, 0);

      setPosition({
        x: newX,
        y: newY,
      });
      setInitialPosition({
        x: newX,
        y: newY,
      });
      setInitialScrollLeft(left);
      setInitialScrollTop(top);
      setMaxHeight(Math.min(Math.max(rootHeight * 0.4, 300), 600));
    },
    [api]
  );

  const showAIPromptExplicitly = useCallback(
    (col: number, row: number) => {
      if (!api) return;

      const cellX = api.getCellX(col);
      const cellY = api.getCellY(row);
      const nextCellX = api.getCellX(col + 1);
      const nextCellY = api.getCellY(row + 1);
      const width = nextCellX - cellX;
      const height = nextCellY - cellY;

      show(cellX, cellY, width, height);

      setTimeout(() => {
        promptAreaRef.current?.focus();
      }, 0);
    },
    [api, show]
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

    const userMessage: Message = {
      content: prompt,
      role: Role.User,
    };

    const resultMessage: Message | undefined = await sendRequest({
      userMessage,
    });

    if (!resultMessage) return;

    const { suggestions } = getSuggestions([userMessage, resultMessage]);

    if (suggestions?.length) {
      setIsSuggestionReview(true);
      setSheetSuggestionsName(currentSheetName ?? '');
      gridCallbacksRef.current.onAIPendingChanges?.(true);
      gridCallbacksRef.current.onApplySuggestion?.(suggestions);

      setResponseId(resultMessage.responseId);
    } else {
      setAssistantTextAnswer(resultMessage.content);
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

    if (!cell?.table?.tableName) return;

    gridCallbacksRef.current?.onUpdateNote?.({
      tableName: cell.table.tableName,
      fieldName: cell.field?.fieldName,
      note: assistantTextAnswer,
    });
    gridCallbacksRef.current.onAIPendingChanges?.(false);
    gridCallbacksRef.current.onAIPendingBanner?.(false);

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
      const isUndo = shortcutApi.is(Shortcut.UndoAction, event);

      if (isOpened && shouldStopPropagation(event)) {
        event.stopPropagation();
      }

      if (isUndo) {
        handleDiscard();

        return;
      }

      if (isEnter && isSuggestionReview) {
        handleKeep();

        return;
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
      handleDiscard,
      handleKeep,
      hide,
      isError,
      isLoading,
      isOpened,
      isSuggestionReview,
      selectedPromptKey,
    ]
  );

  const handleExpandCollapseAIPrompt = useCallback(() => {
    if (!selection || !api) return;

    setIsCollapsed(false);
    if (sheetSuggestionsName && currentSheetName !== sheetSuggestionsName) {
      gridCallbacksRef.current.onOpenSheet?.({
        sheetName: sheetSuggestionsName,
      });
    }
    gridCallbacksRef.current.onAIPendingBanner?.(false);

    const gridSizes = api.getGridSizes();
    const cellX = api.getCellX(selection.startCol);
    const cellY = api.getCellY(selection.startRow);

    api.updateSelection(selection);
    showAIPromptExplicitly(selection.startCol, selection.startRow);

    const {
      x1: left,
      x2: right,
      y1: top,
      y2: bottom,
    } = api.getViewportCoords();
    const rootWidth = right - left;
    const rootHeight = bottom - top;
    const yThreshold = 200;
    const isCellInXViewport = cellX > 0 && cellX < left + rootWidth;
    const isCellInYViewport =
      cellY > 0 && cellY < top + rootHeight - yThreshold;
    if (isCellInXViewport && isCellInYViewport) return;

    api.moveViewport(
      cellX - 3 * gridSizes.cell.width,
      cellY - 5 * gridSizes.cell.height
    );
  }, [
    api,
    currentSheetName,
    gridCallbacksRef,
    selection,
    sheetSuggestionsName,
    showAIPromptExplicitly,
  ]);

  const onViewportChange = useCallback(() => {
    if (!api || !isOpened || isCollapsed) return;

    const { x1, y1, y2, x2 } = api.getViewportCoords();

    const currentTop = initialPosition.y;
    const currentLeft = initialPosition.x;

    const top = currentTop - y1 + initialScrollTop;
    const left = currentLeft - x1 + initialScrollLeft;

    const bottomThreshold = 200;
    const rightThreshold = 200;
    if (
      isSuggestionReview &&
      (top < 0 ||
        top > y2 - bottomThreshold ||
        left < 0 ||
        left > x2 - rightThreshold)
    ) {
      handleCollapseAIPrompt();

      return;
    }

    setPosition({
      x: left,
      y: top,
    });
  }, [
    api,
    handleCollapseAIPrompt,
    initialPosition.x,
    initialPosition.y,
    initialScrollLeft,
    initialScrollTop,
    isCollapsed,
    isOpened,
    isSuggestionReview,
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
    if (!selectionEdges) return;

    if (
      !isSuggestionReview &&
      !assistantTextAnswer &&
      !isLoading &&
      !isError &&
      (selectionEdges?.endCol !== selection?.endCol ||
        selectionEdges?.startCol !== selection?.startCol ||
        selectionEdges?.startRow !== selection?.startRow ||
        selectionEdges?.endRow !== selection?.endRow)
    ) {
      setSelection(selectionEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectionEdges,
    selection?.endCol,
    selection?.endRow,
    selection?.startCol,
    selection?.startRow,
  ]);

  useEffect(() => {
    if (!api) return;

    const openNoteSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeOpenAIPrompt>(GridEvent.openAIPrompt))
      .subscribe(({ col, row }) => {
        if (isCollapsed) {
          handleExpandCollapseAIPrompt();
        } else {
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

    return () => {
      [openNoteSubscription, expandSubscription].forEach((s) =>
        s.unsubscribe()
      );
    };
  }, [
    api,
    handleExpandCollapseAIPrompt,
    isCollapsed,
    selection?.endCol,
    selection?.endRow,
    selection?.startCol,
    selection?.startRow,
    showAIPromptExplicitly,
  ]);

  useEffect(() => {
    if (!api) return;

    const subscription = api.selection$.subscribe((selection) => {
      setSelectionEdges(selection);
    });

    return () => subscription.unsubscribe();
  }, [api]);

  useEffect(() => {
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

  useEffect(() => {
    if (!api) return;

    const unsubscribe = api.gridViewportSubscription(onViewportChange);

    return () => {
      unsubscribe();
    };
  }, [api, onViewportChange]);

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
          data-left={initialPosition.x}
          data-top={initialPosition.y}
          style={{
            top: position.y,
            left: position.x,
            height: defaultGridSizes.cell.height,
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
                            handleTryAgain();
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
                                'flex px-3 gap-2 truncate items-center justify-between py-1 hover:bg-bgAccentPrimaryAlpha',
                                selectedPromptKey === item.key &&
                                  'bg-bgAccentPrimaryAlpha2'
                              )}
                              key={item.key}
                              onClick={() => item.onClick?.()}
                            >
                              <span className="flex gap-2 truncate">
                                <span className="shrink-0 flex items-center">
                                  {item.icon}
                                </span>
                                <Tooltip title={item.label}>
                                  <span className="truncate">{item.label}</span>
                                </Tooltip>
                              </span>
                              {item.shortcut && (
                                <span className="text-textSecondary">
                                  {item.shortcut}
                                </span>
                              )}
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
