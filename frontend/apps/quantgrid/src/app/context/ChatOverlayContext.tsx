import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';
import { toast } from 'react-toastify';
import { debounceTime, Subject, throttleTime } from 'rxjs';

import {
  ChatOverlay,
  ChatOverlayOptions,
  EditMessageEventResponse,
  Feature,
  FeatureData,
  GetMessagesResponse,
  Message,
  MessageButtons,
  MessageCustomButtonResponse,
  NextMessagePlaybackEventResponse,
  OverlayConversation,
  OverlayEvents,
  PrevMessagePlaybackEventResponse,
  Role,
  SelectedConversationLoadedResponse,
} from '@epam/ai-dial-overlay';
import {
  AppTheme,
  CompletionBodyRequest,
  conversationsEndpointType,
  getAffectedEntitiesHighlight,
  getFocusColumns,
  getInitialState,
  getNormalizedStageName,
  getSuggestions,
  GPTFocusColumn,
  GPTState,
  GPTSuggestion,
  Highlight,
  MetadataNodeType,
  NormalizedStageNames,
  projectFoldersRootPrefix,
  Shortcut,
  shortcutApi,
  TableHighlightDataMap,
  themeColors,
  updateChangedSheetsStage,
  updateSummaryStage,
  useStateWithRef,
} from '@frontend/common';
import { escapeTableName } from '@frontend/parser';

import { useApplySuggestions } from '../components/ChatWrapper/useApplySuggestion';
import { useApiRequests, useGridApi } from '../hooks';
import {
  createUniqueName,
  getProjectSelectedConversation,
  setProjectSelectedConversation,
} from '../services';
import {
  checkIcon,
  constructPath,
  copyIcon,
  encodeApiUrl,
  eyeIcon,
  eyeOffIcon,
  focusIcon,
  getConversationPath,
  getDSLChangesFromSheets,
  getLocalConversationsPath,
  regenerateIcon,
  trashIcon,
} from '../utils';
import { ApiContext } from './ApiContext';
import { AppContext } from './AppContext';
import { AppSpreadsheetInteractionContext } from './AppSpreadsheetInteractionContext';
import { InputsContext } from './InputsContext';
import { defaultSheetName, ProjectContext } from './ProjectContext';
import { UndoRedoContext } from './UndoRedoContext';

export const playbackLabel = '[Playback]';
const conversationsUpdatedDebounceTime = 250;
const selectionUpdateDebounceTime = 250;
const viewButtonKey = 'view';
const hideButtonKey = 'hide';
const focusButtonKey = 'focus';
const regenerateButtonKey = 'regenerate';
const deleteButtonKey = 'delete';
const copyButtonKey = 'copy';

const defaultFeatures: Feature[] = [
  Feature.ConversationsSection,
  Feature.ConversationsSharing,
  Feature.ConversationsPublishing,
  Feature.Likes,
  Feature.SkipFocusChatInputOnLoad,
  Feature.HideEmptyChatChangeAgent,
  Feature.HideEditUserMessage,
  Feature.HideRegenerateAssistantMessage,
  Feature.HideDeleteUserMessage,
];
const defaultFeaturesData: Partial<Record<Feature, FeatureData>> = {};

const defaultPendingChangesFeatures: Feature[] = [
  ...defaultFeatures,
  Feature.DisabledSend,
  Feature.EditLastAssistantContent,
];
const defaultPendingChangesFeaturesData: Partial<Record<Feature, FeatureData>> =
  {
    [Feature.DisabledSend]: {
      description: 'Accept or Discard changes to send new message',
    },
  };
const defaultPreviewFeatures: Feature[] = defaultFeatures;
const defaultPreviewFeaturesData: Partial<Record<Feature, FeatureData>> =
  defaultFeaturesData;

type ChatOverlayContextValues = {
  overlay: ChatOverlay | null;
  attachOverlay: (host: HTMLElement | null) => void;

  GPTSuggestions: GPTSuggestion[] | null;
  focusColumns: GPTFocusColumn[] | null;
  projectConversations: OverlayConversation[];
  userLocalConversations: OverlayConversation[];
  selectedConversation: OverlayConversation | undefined;
  isReadOnlyProjectChats: boolean;
  isConversationsLoading: boolean;
  answerIsGenerating: boolean;

  createConversation: () => void;
  createPlayback: (conversationId: string) => void;
  onApplySuggestion: () => void;

  isAIPendingChanges: boolean;
  acceptPendingChanges: () => Promise<void>;
  discardPendingChanges: () => void;
  isAIEditPendingChanges: boolean;
  updateAIEditPendingChanges: (value: boolean) => void;

  isMajorChangedAIAnswer: boolean;
  regenerateSummary: () => void;

  isAIPreview: boolean;
  exitAIPreview: () => void;

  renameConversation: (id: string, newName: string) => Promise<void>;
};

export const ChatOverlayContext = createContext<ChatOverlayContextValues>(
  {} as ChatOverlayContextValues
);

export function ChatOverlayContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { sendDialRequest } = useApiRequests();
  const {
    projectSheets,
    sheetName,
    projectName,
    projectPath,
    projectBucket,
    selectedCell,
    parsedSheets,
    parsedSheet,
    fieldInfos,
    responseIds,
    sheetContent,
    hasEditPermissions,
    isProjectReadonlyByUser,
    beforeTemporaryState,
    updateSheetContent,
    setDiffData,
    startTemporaryState,
    setIsTemporaryStateEditable,
    resolveTemporaryState,
    setIsProjectEditingDisabled,
  } = useContext(ProjectContext);
  const { openField } = useContext(AppSpreadsheetInteractionContext);
  const projectHashes = useMemo(
    () => fieldInfos.map((f) => f.hash),
    [fieldInfos]
  );

  const [isAIPendingChanges, setIsAIPendingChanges, isAIPendingChangesRef] =
    useStateWithRef(false);
  const [isAIEditPendingChanges, setIsAIEditPendingChanges] =
    useStateWithRef(false);
  const [isAIPreview, setIsAIPreview, isAIPreviewRef] = useStateWithRef(false);
  const [aiPreviewMessageIndex, setAIPreviewMessageIndex] = useState<
    number | undefined
  >();

  const [overlayFeatures, setOverlayFeatures] =
    useState<Feature[]>(defaultFeatures);
  const [overlayFeaturesData, setOverlayFeaturesData] = useState<
    Partial<Record<Feature, FeatureData>>
  >({});
  const { getSharedWithMeConversations } = useApiRequests();
  const { inputs } = useContext(InputsContext);
  const { appendTo } = useContext(UndoRedoContext);
  const { userBucket } = useContext(ApiContext);
  const { theme } = useContext(AppContext);
  const gridApi = useGridApi();
  const { applySuggestion, onFocusColumns } = useApplySuggestions();
  const [customButtons, setCustomButtons] = useState<MessageButtons[]>([]);
  const [isMessageCopied, setIsMessageCopied] = useState(false);

  const [overlayHostElement, setOverlayHostElement] =
    useState<HTMLElement | null>(null);
  const overlayInitialized = useRef(false);

  const [overlay, setOverlay, overlayRef] = useStateWithRef<ChatOverlay | null>(
    null
  );
  const [GPTSuggestions, setGPTSuggestions, gptSuggestionsRef] =
    useStateWithRef<GPTSuggestion[] | null>(null);
  const [focusColumns, setFocusColumns, focusColumnsRef] = useStateWithRef<
    GPTFocusColumn[] | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [projectConversations, setProjectConversations] = useState<
    OverlayConversation[]
  >([]);
  const [userLocalConversations, setUserLocalConversations] = useState<
    OverlayConversation[]
  >([]);
  const [selectedConversation, setSelectedConversation] =
    useState<OverlayConversation>();
  const [aiProjectHashes, setAIProjectHashes] = useState<
    (string | undefined)[] | null
  >(null);
  const [isMajorChangedAIAnswer, setIsMajorChangedAIAnswer] = useState(false);
  const [isMajorEditManualEdit, setIsMajorEditManualEdit] = useState(false);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [
    isProjectChangedDuringPendingAIChanges,
    setIsProjectChangedDuringPendingAIChanges,
  ] = useState(false);
  const isProjectReadonly = useMemo(
    () => !hasEditPermissions || isProjectReadonlyByUser,
    [hasEditPermissions, isProjectReadonlyByUser]
  );

  const affectedEntitiesRef = useRef<TableHighlightDataMap | null>(null);

  const sharedWithMeConversationFolders = useMemo(async () => {
    if (!userBucket) return [];

    const res = await getSharedWithMeConversations();

    return (
      res?.filter((item) => item.nodeType === MetadataNodeType.FOLDER) ?? []
    );
  }, [getSharedWithMeConversations, userBucket]);

  const conversationsFolderId = useMemo(
    () =>
      constructPath([
        conversationsEndpointType,
        getConversationPath({
          bucket: projectBucket,
          path: projectPath,
          projectName,
        }),
      ]),
    [projectBucket, projectName, projectPath]
  );

  // TODO: too long names - can be a problem on BE to save this
  const localUserConversationsFolderId = useMemo(
    () =>
      constructPath([
        conversationsEndpointType,
        getLocalConversationsPath({
          userBucket,
          bucket: projectBucket,
          path: projectPath,
          projectName,
        }),
      ]),
    [projectBucket, projectName, projectPath, userBucket]
  );

  const canInitOverlay =
    !!overlayHostElement &&
    !!projectName &&
    !!projectBucket &&
    !!conversationsFolderId;

  const isProjectChatsFolderShared = useMemo(async () => {
    const folders = await sharedWithMeConversationFolders;

    return folders.some(
      (item) =>
        encodeApiUrl(
          constructPath([item.bucket, item.parentPath, item.name])
        ) === conversationsFolderId
    );
  }, [conversationsFolderId, sharedWithMeConversationFolders]);

  const isReadOnlyProjectChats = useMemo(() => {
    return (
      !hasEditPermissions ||
      isProjectReadonlyByUser ||
      (!isProjectChatsFolderShared && projectBucket !== userBucket)
    );
  }, [
    hasEditPermissions,
    isProjectReadonlyByUser,
    isProjectChatsFolderShared,
    projectBucket,
    userBucket,
  ]);

  const updateAIEditPendingChanges = useCallback(
    (value: boolean) => {
      setIsAIEditPendingChanges(value);
      setIsTemporaryStateEditable(value);

      if (!affectedEntitiesRef.current || isAIPreviewRef.current) return;

      setDiffData({
        data: affectedEntitiesRef.current.data,
        defaultHighlight: value ? Highlight.NORMAL : Highlight.DIMMED,
      });
    },
    [
      isAIPreviewRef,
      setDiffData,
      setIsAIEditPendingChanges,
      setIsTemporaryStateEditable,
    ]
  );

  const getOverlayOptions = useCallback((): ChatOverlayOptions => {
    const resultedFolderId = isReadOnlyProjectChats
      ? localUserConversationsFolderId
      : conversationsFolderId;

    return {
      hostDomain: window.location.origin,
      domain: window.externalEnv.dialOverlayUrl || '',
      theme: theme === AppTheme.ThemeLight ? 'light' : 'dark',
      modelId: window.externalEnv.qgBotDeploymentName,
      newConversationsFolderId: resultedFolderId,
      requestTimeout: 10000,
      loaderStyles: {
        padding: '20px',
        textAlign: 'center',
      },
      // loaderHideEvent: OverlayEvents.readyToInteract,
      signInOptions: {
        autoSignIn: true,
        // signInProvider: window.externalEnv.authProvider,
        signInProvider: 'keycloak',
      },
      enabledFeatures: overlayFeatures,
      enabledFeaturesData: overlayFeaturesData,
      messageButtons: customButtons,
    };
  }, [
    conversationsFolderId,
    customButtons,
    isReadOnlyProjectChats,
    localUserConversationsFolderId,
    overlayFeatures,
    overlayFeaturesData,
    theme,
  ]);

  const sendAssistantStatusMessage = useCallback(
    async (
      messages: Message[],
      status: 'ACCEPTED' | 'DISCARDED',
      regenerateFocus?: boolean
    ) => {
      if (!messages.length || !projectSheets) return;

      const qgBotDeploymentName =
        (window as any)?.externalEnv?.qgBotDeploymentName ?? 'qg';
      const lastAssistantMessage = messages[messages.length - 1];
      const initialState = getInitialState([lastAssistantMessage]);
      const sheets: { [key: string]: string } = {};
      for (const sheet of projectSheets) {
        sheets[sheet.sheetName] = sheet.content;
      }

      const stages = lastAssistantMessage.custom_content?.stages;
      const resultingStages = stages?.map((stage) => {
        const normalizedStageName = getNormalizedStageName(stage.name);
        switch (normalizedStageName) {
          case NormalizedStageNames.SUMMARY: {
            return updateSummaryStage(stage, lastAssistantMessage.content);
          }
          case NormalizedStageNames.CHANGED_SHEETS: {
            return updateChangedSheetsStage(stage, sheets);
          }
          default:
            return stage;
        }
      });

      const systemMessageContent = {
        projectState: initialState?.projectState,
        generationParameters: {
          question_status: status,

          generate_actions: null,
          generate_summary: null,
          generate_focus: regenerateFocus === true || null,
          generate_standalone_question: null,
          saved_stages: resultingStages,
        },
      } as GPTState;

      const messagesWithoutLastAssistant = messages
        .slice(0, -1)
        .map((message) => ({
          content: message.content,
          role: message.role,
        }));
      const resultedMessages = [
        {
          content: JSON.stringify(systemMessageContent),
          role: Role.System,
        },
        ...messagesWithoutLastAssistant.slice(1),
      ];

      try {
        const res = await sendDialRequest(
          `/openai/deployments/${encodeURI(
            qgBotDeploymentName
          )}/chat/completions`,
          {
            body: JSON.stringify({
              messages: resultedMessages,
            } as CompletionBodyRequest),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res.ok) {
          const errorText = await res.json();
          throw new Error(
            `Error ${res.status}(${res.statusText}): ${JSON.stringify(
              errorText
            )}`
          );
        }

        const respMessage = await res.json();
        const resultedMessage: Message = {
          responseId: respMessage.id,
          content: respMessage.choices[0]?.message.content,
          custom_content: respMessage.choices[0]?.message.custom_content,
          role: Role.Assistant,
        };

        return resultedMessage;
      } catch (e) {
        toast.warn('Failing when sending resulting completion');
        // eslint-disable-next-line no-console
        console.error(e);

        return;
      }
    },
    [projectSheets, sendDialRequest]
  );

  const acceptPendingChanges = useCallback(async () => {
    if (!projectName || !projectBucket || !overlay) {
      return;
    }

    const { messages } = await overlay.getMessages();
    if (!isProjectReadonly) {
      try {
        const userMessage = messages[messages.length - 2].content;
        const resultedMessage = await sendAssistantStatusMessage(
          messages,
          'ACCEPTED',
          isMajorEditManualEdit
        );
        if (resultedMessage) {
          const maxMessageLength = 5000;
          const resultedSuggestions =
            resultedMessage && getSuggestions([resultedMessage]);
          appendTo(
            `AI action: ${userMessage?.slice(0, maxMessageLength)}`,
            resultedSuggestions.map((suggestion) => ({
              content: suggestion.dsl,
              sheetName: suggestion.sheetName,
            }))
          );
        }

        if (resultedMessage && !selectedConversation?.isPlayback) {
          await overlay.updateMessage(messages.length - 1, {
            content: resultedMessage.content,
            custom_content: resultedMessage.custom_content,
          });
        }
      } catch {
        // EMPTY catch
      }
    }

    if (isProjectReadonly) {
      setAIPreviewMessageIndex((messages.length ?? 0) - 1);
      setIsAIPreview(true);
      setIsAIPendingChanges(false);
      updateAIEditPendingChanges(false);
      setOverlayFeatures(defaultPreviewFeatures);
      setOverlayFeaturesData(defaultPreviewFeaturesData);

      return;
    }

    setIsAIPendingChanges(false);
    updateAIEditPendingChanges(false);
    setDiffData(null);
    resolveTemporaryState({ useTemporary: true });
    setOverlayFeatures(defaultFeatures);
    setOverlayFeaturesData(defaultFeaturesData);
  }, [
    appendTo,
    isMajorEditManualEdit,
    isProjectReadonly,
    overlay,
    projectBucket,
    projectName,
    resolveTemporaryState,
    selectedConversation?.isPlayback,
    sendAssistantStatusMessage,
    setDiffData,
    setIsAIPendingChanges,
    setIsAIPreview,
    updateAIEditPendingChanges,
  ]);

  const discardUserMessage = useCallback(
    async (userMessageIndex?: number) => {
      if (!overlay) return;

      const { messages } = await overlay.getMessages();
      const { conversations } = await overlay.getSelectedConversations();
      let messageIndex = userMessageIndex ?? -1;
      if (messageIndex === -1) {
        messages.forEach((msg, index) => {
          if (msg.role === Role.User) {
            messageIndex = index;
          }
        });
      }
      const userMessage = messages[messageIndex];

      if (!userMessage || conversations[0]?.isPlayback) return;

      await overlay.deleteMessage(messageIndex);

      // We need to clear system message also
      if (messageIndex === 1) {
        await overlay.deleteMessage(0);
      }

      return userMessage;
    },
    [overlay]
  );

  const loadMessageInitialState = useCallback(
    async (message: Message) => {
      const messageInitialState = getInitialState([message]);

      if (!messageInitialState?.projectState.sheets) {
        return;
      }

      const dslChanges = getDSLChangesFromSheets(
        messageInitialState.projectState.sheets
      );
      const resultingDSLChanges = dslChanges.concat(
        (projectSheets ?? [])
          .filter(
            (sheet) =>
              !dslChanges.find(
                (dslChange) => dslChange.sheetName === sheet.sheetName
              )
          )
          .map((item) => ({ sheetName: item.sheetName, content: undefined }))
      );

      await updateSheetContent(resultingDSLChanges, {
        responseIds: [],
        sendPutWorksheet: false,
      });
    },
    [projectSheets, updateSheetContent]
  );

  const revertMessageChanges = useCallback(
    async (
      message: Message,
      args: { skipHistory?: boolean; skipPut?: boolean } = {}
    ) => {
      const messageInitialState = getInitialState([message]);

      if (!messageInitialState?.projectState.sheets) {
        return;
      }

      const dslChanges = getDSLChangesFromSheets(
        messageInitialState.projectState.sheets
      );
      const updatedResponsesIds = responseIds.filter(
        ({ responseId }) => responseId !== message.responseId
      );
      await updateSheetContent(dslChanges, {
        responseIds: updatedResponsesIds,
        sendPutWorksheet: !args.skipPut,
      });
      if (!args.skipHistory) {
        appendTo('Revert AI changes', dslChanges);
      }
    },
    [appendTo, responseIds, updateSheetContent]
  );

  const discardPendingChanges = useCallback(
    async (discardMessage = true) => {
      if (
        !isAIPendingChangesRef.current ||
        !projectName ||
        !projectBucket ||
        !overlay
      ) {
        return;
      }

      const { messages } = await overlay.getMessages();
      if (!messages[messages.length - 1]) return;

      // Just send message to bot to track discard
      sendAssistantStatusMessage(messages, 'DISCARDED');
      revertMessageChanges(messages[messages.length - 1]);

      setIsAIPendingChanges(false);
      updateAIEditPendingChanges(false);
      setDiffData(null);
      resolveTemporaryState({ useServer: true });

      // We need to reset disabled features
      setOverlayFeatures(defaultFeatures);
      setOverlayFeaturesData(defaultFeaturesData);

      if (discardMessage) {
        const lastUserMessage = await discardUserMessage();
        if (lastUserMessage?.content) {
          await overlay.setInputContent(lastUserMessage.content);
        }
      }
    },
    [
      discardUserMessage,
      isAIPendingChangesRef,
      overlay,
      projectBucket,
      projectName,
      resolveTemporaryState,
      revertMessageChanges,
      sendAssistantStatusMessage,
      setDiffData,
      setIsAIPendingChanges,
      updateAIEditPendingChanges,
    ]
  );

  const exitAIPreview = useCallback(() => {
    setIsAIPreview(false);
    setAIPreviewMessageIndex(undefined);
    setDiffData(null);
    resolveTemporaryState({ useServer: true });

    setOverlayFeatures(defaultFeatures);
    setOverlayFeaturesData(defaultFeaturesData);

    if (!selectedConversation?.isPlayback || !overlay) return;

    // Exit from the playback preview mode
    const originalConversationName = selectedConversation.name
      .replace(playbackLabel, '')
      .trimStart();

    // Find the original conversation matching the playback name
    const matchingOriginalConversation = projectConversations
      .concat(userLocalConversations)
      .find(
        ({ name, isPlayback }) =>
          !isPlayback && name === originalConversationName
      );

    // Fallback to the first non-playback conversation if the matching one isn't found
    const firstNonPlaybackConversation = projectConversations
      .concat(userLocalConversations)
      .find(({ isPlayback }) => !isPlayback);

    // Select the appropriate conversation based on availability
    if (matchingOriginalConversation) {
      setSelectedConversation(matchingOriginalConversation);
      overlay.selectConversation(matchingOriginalConversation.id);
    } else if (firstNonPlaybackConversation) {
      setSelectedConversation(firstNonPlaybackConversation);
      overlay.selectConversation(firstNonPlaybackConversation.id);
    } else {
      setSelectedConversation(undefined);
    }
  }, [
    setIsAIPreview,
    setDiffData,
    resolveTemporaryState,
    selectedConversation?.isPlayback,
    selectedConversation?.name,
    overlay,
    projectConversations,
    userLocalConversations,
  ]);

  const updateSelectedConversation = useCallback(async () => {
    if (!overlay || !projectName || !projectBucket) {
      setSelectedConversation(undefined);

      return;
    }

    const { conversations } = await overlay.getSelectedConversations();
    const firstItem = conversations.length ? conversations[0] : undefined;

    if (
      selectedConversation?.isPlayback &&
      firstItem?.id !== selectedConversation?.id &&
      isAIPreview
    ) {
      exitAIPreview();
    }

    if (!firstItem) {
      setSelectedConversation(undefined);

      return;
    }

    setSelectedConversation(firstItem);
    setProjectSelectedConversation(
      firstItem.id,
      projectName,
      projectBucket,
      projectPath
    );

    if (!firstItem.isPlayback) return;

    // We need to load initial state for playback
    // TODO: update types in chat to have playback
    const message = (
      (firstItem as any).playback.messagesStack as Message[]
    ).find((message) => message.role === Role.Assistant);
    if (!message) return;

    loadMessageInitialState(message);
    setIsAIPreview(true);
    startTemporaryState();
  }, [
    overlay,
    projectName,
    projectBucket,
    selectedConversation?.isPlayback,
    selectedConversation?.id,
    isAIPreview,
    projectPath,
    loadMessageInitialState,
    setIsAIPreview,
    startTemporaryState,
    exitAIPreview,
  ]);

  const updateConversationsList = useCallback(
    (conversations: OverlayConversation[]) => {
      const resultedConversations = [];

      const projectConversations = conversations
        .filter(({ folderId }) => folderId === conversationsFolderId)
        .sort((a, b) =>
          a.updatedAt && b.updatedAt ? b.updatedAt - a.updatedAt : -1
        );
      setProjectConversations(projectConversations);
      resultedConversations.push(...projectConversations);

      const userLocalConversations = conversations
        .filter(({ folderId }) => folderId === localUserConversationsFolderId)
        .sort((a, b) =>
          a.updatedAt && b.updatedAt ? b.updatedAt - a.updatedAt : -1
        );
      setUserLocalConversations(userLocalConversations);
      resultedConversations.push(...userLocalConversations);

      return resultedConversations;
    },
    [conversationsFolderId, localUserConversationsFolderId]
  );

  const setSystemPrompt = useCallback(
    async (args?: {
      projectSheetsState?: Record<string, string>;
      generationParameters?: GPTState['generationParameters'];
    }) => {
      if (
        !overlayHostElement ||
        !overlay ||
        !overlayRef.current ||
        !projectSheets ||
        !sheetName ||
        !projectName ||
        !gridApi
      )
        return;

      const resultedSheets = beforeTemporaryState?.sheets ?? projectSheets;
      const resultedCurrentSheetName = isProjectReadonly
        ? createUniqueName(
            defaultSheetName,
            resultedSheets?.map((sheet) => sheet.sheetName) ?? []
          )
        : resultedSheets.some((sheet) => sheet.sheetName === sheetName)
        ? sheetName
        : resultedSheets[0].sheetName;

      let resultedProjectStateSheets: Record<string, string> | undefined =
        args?.projectSheetsState;
      if (!resultedProjectStateSheets) {
        resultedProjectStateSheets = {};
        const resultedProjectSheets =
          beforeTemporaryState?.sheets ?? projectSheets;

        for (const sheet of resultedProjectSheets) {
          resultedProjectStateSheets[sheet.sheetName] = sheet.content;
        }
      }

      const selection = gridApi.selection$.getValue();

      const currentProjectName = encodeApiUrl(
        constructPath(['files', projectBucket, projectPath, projectName])
      );

      const inputFolder = encodeApiUrl(
        constructPath([
          constructPath([
            'files',
            projectBucket,
            projectFoldersRootPrefix,
            projectPath,
            projectName,
          ]),
        ])
      );

      const state = {
        sheets: resultedProjectStateSheets,
        inputs,
        inputFolder,
        currentSheet: resultedCurrentSheetName,
        currentProjectName,
        selection,
        selectedTableName: selectedCell?.tableName,
      };

      const finalObject = {
        projectState: state,
        generationParameters: args?.generationParameters,
      };

      await overlay.setSystemPrompt(JSON.stringify(finalObject));
    },
    [
      beforeTemporaryState?.sheets,
      gridApi,
      inputs,
      isProjectReadonly,
      overlay,
      overlayHostElement,
      overlayRef,
      projectBucket,
      projectName,
      projectPath,
      projectSheets,
      selectedCell?.tableName,
      sheetName,
    ]
  );

  const regenerateSummary = useCallback(async () => {
    if (!isMajorChangedAIAnswer || !projectSheets || !overlay) return;

    const { messages } = await overlay.getMessages();
    const lastUserMessage = await discardUserMessage();
    if (!lastUserMessage?.content) return;

    const sheets: { [key: string]: string } = {};
    for (const sheet of projectSheets) {
      sheets[sheet.sheetName] = sheet.content;
    }
    const lastAssistantMessage = messages[messages.length - 1];
    const messageInitialState = getInitialState([lastAssistantMessage]);
    const stages = lastAssistantMessage.custom_content?.stages;
    const resultingStages = stages?.map((stage) => {
      const normalizedStageName = getNormalizedStageName(stage.name);
      switch (normalizedStageName) {
        case NormalizedStageNames.CHANGED_SHEETS: {
          return updateChangedSheetsStage(stage, sheets);
        }
        default:
          return stage;
      }
    });
    await setSystemPrompt({
      projectSheetsState: messageInitialState?.projectState.sheets,
      generationParameters: {
        question_status: 'UNDECIDED',
        saved_stages: resultingStages ?? [],

        generate_actions: null,
        generate_focus: true,
        generate_summary: true,
        generate_standalone_question: null,
      },
    });
    await overlay?.sendMessage(lastUserMessage.content);

    setIsMajorChangedAIAnswer(false);
    setIsProjectChangedDuringPendingAIChanges(false);
    setAIProjectHashes(null);
  }, [
    discardUserMessage,
    isMajorChangedAIAnswer,
    overlay,
    projectSheets,
    setSystemPrompt,
  ]);

  const clearSuggestions = useCallback(() => {
    setGPTSuggestions(null);
    setFocusColumns([]);
  }, [setFocusColumns, setGPTSuggestions]);

  const createConversation = useCallback(async () => {
    if (!overlay || !projectName || !projectBucket) return;

    await overlay.createLocalConversation();

    try {
      setSystemPrompt();
    } catch (error) {
      // avoid localhost unhandled errors
    }
  }, [overlay, projectName, projectBucket, setSystemPrompt]);

  const createPlayback = useCallback(
    async (conversationId: string) => {
      if (!overlay) return;

      const { conversation } = await overlay.createPlaybackConversation(
        conversationId
      );

      if (conversation?.id) {
        await overlay.selectConversation(conversation.id);
      }
    },
    [overlay]
  );

  const renameConversation = useCallback(
    async (id: string, newName: string) => {
      if (!overlay || !projectName || !projectBucket) return;

      await overlay.renameConversation(id, newName);
      await updateSelectedConversation();
    },
    [overlay, projectBucket, projectName, updateSelectedConversation]
  );

  const updateSuggestions = useCallback(
    async (overlayInstance: ChatOverlay) => {
      if (!overlayInstance) return;

      const { messages } =
        (await overlayInstance.getMessages()) as GetMessagesResponse;

      const suggestions = getSuggestions(messages);
      const focusColumns = getFocusColumns(messages);
      const affectedEntities = getAffectedEntitiesHighlight(messages);

      setGPTSuggestions(suggestions);
      setFocusColumns(focusColumns);
      affectedEntitiesRef.current = {
        data: affectedEntities,
        defaultHighlight: Highlight.DIMMED,
      };
    },
    [setFocusColumns, setGPTSuggestions]
  );

  const updateCustomButtons = useCallback(async () => {
    if (!overlay || !overlayRef.current || !projectSheets) return;

    const { messages } = (await overlay.getMessages()) as GetMessagesResponse;
    const sheets: { [key: string]: string } = {};
    const resultedProjectSheets = isProjectReadonly
      ? beforeTemporaryState?.sheets ?? projectSheets
      : projectSheets;
    for (const sheet of resultedProjectSheets) {
      sheets[sheet.sheetName] = sheet.content;
    }

    const isConversationEditable =
      selectedConversation?.permissions?.includes('WRITE' as any) ||
      selectedConversation?.bucket === 'local' ||
      selectedConversation?.bucket === userBucket;
    const isPlayback = !!selectedConversation?.isPlayback;
    const tablesInSheet = Object.values(parsedSheets)
      .map((sheet) => sheet.tables)
      .flat();
    const newButtons = messages
      .map((msg, index) => {
        const isLastMessage = index === messages.length - 1;

        if (isGenerating) return undefined;

        if (msg.role === Role.User) {
          const showDeleteButton = !isPlayback && isConversationEditable;

          return {
            messageIndex: index,
            buttons: [
              {
                buttonKey: copyButtonKey,
                events: ['click'],
                iconSvg: isMessageCopied ? checkIcon : copyIcon,
                tooltip: 'Copy',
                title: 'Copy',
                placement: 'PREPEND_DEFAULT_BUTTONS',
              },
              showDeleteButton
                ? {
                    buttonKey: deleteButtonKey,
                    events: ['click'],
                    iconSvg: trashIcon,
                    tooltip: 'Delete',
                    title: 'Delete',
                    placement: 'PREPEND_DEFAULT_BUTTONS',
                  }
                : undefined,
            ].filter(Boolean),
          } as MessageButtons;
        }

        if (msg.role === Role.Assistant) {
          const suggestions = getSuggestions([msg]);
          const focusColumns = getFocusColumns([msg]);
          const focus = focusColumns[focusColumns.length - 1];
          const hasSuggestions = !!suggestions.length;
          const hasFocus = focusColumns.length;

          const escapedFocusTableName = focus?.tableName
            ? escapeTableName(focus.tableName)
            : '';
          const focusParsedTable = escapedFocusTableName
            ? tablesInSheet.find(
                (table) => table.tableName === escapedFocusTableName
              )
            : undefined;
          const focusParsedField = focusParsedTable?.fields.find(
            (f) => f.key.fieldName === focus?.columnName
          );
          const responseIdExists =
            msg.responseId &&
            responseIds.some(({ responseId }) => responseId === msg.responseId);
          const isFocusable =
            focusParsedTable &&
            focusParsedField &&
            (responseIdExists || isAIPreview || !hasSuggestions);

          const focusTooltip = isFocusable
            ? ''
            : !focusParsedTable
            ? 'The tables suggested by the bot are not included in the project and cannot receive focus.'
            : !focusParsedField
            ? 'The columns suggested by the bot are not included in the project and cannot receive focus.'
            : !responseIdExists
            ? 'This suggestion has not been applied to the project.'
            : '';

          const isHidePreviewButton =
            isAIPreview && aiPreviewMessageIndex === index;

          const suggestionSheets = suggestions.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.dsl;

            return acc;
          }, {} as Record<string, string>);
          const beforeSuggestionsSheets =
            resultedProjectSheets.reduce((acc, curr) => {
              acc[curr.sheetName] = curr.content;

              return acc;
            }, {} as Record<string, string>) ?? {};
          const suggestionsSameAsState =
            isEqual(
              Object.keys(suggestionSheets),
              Object.keys(beforeSuggestionsSheets)
            ) &&
            Object.entries(suggestionSheets).every(
              ([key, value]) =>
                value.trim() === beforeSuggestionsSheets[key].trim()
            );
          const isMsgStateOnScreen =
            msg.responseId ===
              responseIds[responseIds.length - 1]?.responseId &&
            suggestionsSameAsState;
          const showRegenerateButton =
            !isPlayback &&
            isLastMessage &&
            isConversationEditable &&
            (!hasSuggestions ||
              (isProjectReadonly && !isAIPendingChanges) ||
              isAIPendingChanges ||
              isMsgStateOnScreen);

          return {
            messageIndex: index,
            buttons: [
              isAIPendingChanges ||
              !hasSuggestions ||
              selectedConversation?.isPlayback
                ? undefined
                : {
                    buttonKey: isHidePreviewButton
                      ? hideButtonKey
                      : viewButtonKey,
                    events: ['click'],
                    title: isHidePreviewButton
                      ? 'Exit review'
                      : 'Review changes',
                    iconSvg: isHidePreviewButton ? eyeOffIcon : eyeIcon,
                    styles: {
                      backgroundColor:
                        themeColors[theme].controlsBgAccentSecondary,
                      color: themeColors[theme].controlsTextPermanent,
                    },
                    hoverStyles: {
                      backgroundColor:
                        themeColors[theme].controlsBgAccentHoverSecondary,
                    },
                  },
              hasFocus
                ? {
                    buttonKey: focusButtonKey,
                    events: ['click'],
                    title: 'Focus',
                    iconSvg: `<span style="color:${themeColors[theme].textSecondary}">${focusIcon}</span>`,
                    styles: {
                      backgroundColor: themeColors[theme].bgLayer3,
                    },
                    hoverStyles: {
                      backgroundColor: themeColors[theme].bgLayer2,
                    },
                    disabled: !isFocusable,
                    tooltip: !isFocusable ? focusTooltip : undefined,
                  }
                : null,
              showRegenerateButton
                ? {
                    buttonKey: regenerateButtonKey,
                    events: ['click'],
                    iconSvg: regenerateIcon,
                    tooltip: 'Regenerate',
                    title: 'Regenerate',
                    placement: 'PREPEND_DEFAULT_BUTTONS',
                  }
                : undefined,
            ].filter(Boolean),
          } as MessageButtons;
        }

        return undefined;
      })
      .filter((val) => !!val);

    setCustomButtons(newButtons);
  }, [
    overlay,
    overlayRef,
    projectSheets,
    isProjectReadonly,
    beforeTemporaryState?.sheets,
    selectedConversation?.permissions,
    selectedConversation?.bucket,
    selectedConversation?.isPlayback,
    userBucket,
    parsedSheets,
    isGenerating,
    isMessageCopied,
    responseIds,
    isAIPreview,
    aiPreviewMessageIndex,
    isAIPendingChanges,
    theme,
  ]);

  const handleInitOverlay = useCallback(
    async (overlay: ChatOverlay) => {
      if (!projectName || !projectBucket || !overlay) return;

      setIsConversationsLoading(true);

      const savedSelectedConversation = getProjectSelectedConversation(
        projectName,
        projectBucket,
        projectPath
      );

      const { conversations } = await overlay.getConversations();

      const allProjectConversations = updateConversationsList(conversations);

      // Clean up playback conversations on initialization
      const playbackConversationsToRemove = allProjectConversations.filter(
        (conversation) => conversation.isPlayback
      );

      for (const playbackConversation of playbackConversationsToRemove) {
        await overlay.deleteConversation(playbackConversation.id);
      }

      const updatedConversations = allProjectConversations.filter(
        (conversation) => !conversation.isPlayback
      );

      // Replace the original array contents
      allProjectConversations.length = 0;
      allProjectConversations.push(...updatedConversations);

      const allConversationsIds = allProjectConversations.map(({ id }) => id);
      const isConversationExists =
        savedSelectedConversation &&
        allConversationsIds.includes(savedSelectedConversation);

      setIsConversationsLoading(false);

      if (isConversationExists) {
        overlay.selectConversation(savedSelectedConversation);

        return;
      }

      if (allProjectConversations.length) {
        overlay.selectConversation(allProjectConversations[0].id);

        return;
      }

      createConversation();
    },
    [
      createConversation,
      projectBucket,
      projectName,
      projectPath,
      updateConversationsList,
    ]
  );

  const onApplySuggestion = useCallback(async () => {
    setIsAIPendingChanges(true);
    setIsMajorEditManualEdit(false);
    setDiffData(affectedEntitiesRef.current);
    startTemporaryState();

    const { messages = [] } = (await overlay?.getMessages()) ?? {};
    const lastMsg = messages.at(-1);
    const responseId =
      lastMsg?.role === Role.Assistant ? lastMsg.responseId : undefined;

    await applySuggestion(gptSuggestionsRef.current, focusColumnsRef.current, {
      withPut: false,
      responseId,
      withHistoryItem: false,
    });

    setOverlayFeatures(defaultPendingChangesFeatures);
    setOverlayFeaturesData(defaultPendingChangesFeaturesData);
  }, [
    applySuggestion,
    focusColumnsRef,
    gptSuggestionsRef,
    overlay,
    setDiffData,
    setIsAIPendingChanges,
    startTemporaryState,
  ]);

  const handleSubStartGenerating = useCallback(() => {
    setIsGenerating(true);
    setIsProjectEditingDisabled(true);
    clearSuggestions();
  }, [clearSuggestions, setIsProjectEditingDisabled]);

  const handleSubEndGenerating = useCallback(async () => {
    setIsGenerating(false);
    setIsProjectEditingDisabled(false);

    if (!overlay || !overlayRef.current) return;

    await updateSuggestions(overlay);

    if (selectedConversation?.isPlayback) return;

    if (gptSuggestionsRef.current?.length) {
      onApplySuggestion();
    } else if (focusColumnsRef.current?.length) {
      onFocusColumns(focusColumnsRef.current);
    }

    updateSelectedConversation();
  }, [
    setIsProjectEditingDisabled,
    overlay,
    overlayRef,
    updateSuggestions,
    selectedConversation?.isPlayback,
    gptSuggestionsRef,
    focusColumnsRef,
    updateSelectedConversation,
    onApplySuggestion,
    onFocusColumns,
  ]);

  const handleSubSelectedConversationLoaded = useCallback(
    async (payload: unknown) => {
      if (!projectName || !projectBucket || !overlay) return;

      const { selectedConversationIds } =
        payload as SelectedConversationLoadedResponse;

      if (selectedConversationIds.length > 0) {
        setProjectSelectedConversation(
          selectedConversationIds[0],
          projectName,
          projectBucket,
          projectPath
        );
      }

      updateSelectedConversation();
      clearSuggestions();
    },
    [
      clearSuggestions,
      overlay,
      projectBucket,
      projectName,
      projectPath,
      updateSelectedConversation,
    ]
  );

  const handleSubConversationsUpdated = useCallback(async () => {
    if (!overlay || !overlayRef.current) return;
    const { conversations } = await overlay.getConversations();
    updateConversationsList(conversations);
    updateCustomButtons();
  }, [overlay, overlayRef, updateConversationsList, updateCustomButtons]);

  const onReviewChanges = useCallback(
    (messageIndex: number, message: Message) => {
      const suggestions = getSuggestions([message]);
      const focusColumns = getFocusColumns([message]);
      const affectedEntities = getAffectedEntitiesHighlight([message]);

      setIsAIPreview(true);
      setAIPreviewMessageIndex(messageIndex);
      setDiffData({
        data: affectedEntities,
        defaultHighlight: Highlight.DIMMED,
      });
      startTemporaryState();
      applySuggestion(suggestions, focusColumns, {
        withPut: false,
        withHistoryItem: false,
        ignoreViewportWhenPlacing: true,
      });
    },
    [applySuggestion, setDiffData, setIsAIPreview, startTemporaryState]
  );

  const handleSubNextPlaybackMessage = useCallback(
    (info: unknown) => {
      if (!overlay || !overlayRef.current) return;

      const { playbackState, newActiveIndex } =
        info as NextMessagePlaybackEventResponse;
      const message = playbackState.messagesStack[newActiveIndex];

      onReviewChanges(newActiveIndex, message);
    },
    [onReviewChanges, overlay, overlayRef]
  );

  const handleSubPrevPlaybackMessage = useCallback(
    (info: unknown) => {
      if (!overlay || !overlayRef.current) return;

      const { playbackState, newActiveIndex } =
        info as PrevMessagePlaybackEventResponse;
      const activeIndex = Math.max(0, newActiveIndex - 1);

      // Load initial playback state if returned to initial playback
      if (activeIndex === 0) {
        const message = playbackState.messagesStack.find(
          (message) => message.role === Role.Assistant
        );
        if (!message) return;

        loadMessageInitialState(message);

        return;
      }

      // If no suggestions we need to load state before
      const activeMessage = playbackState.messagesStack[activeIndex];
      const messageSuggestions =
        activeMessage && getSuggestions([activeMessage]);
      if (!messageSuggestions?.length) {
        if (!activeMessage) return;

        loadMessageInitialState(activeMessage);

        return;
      }

      onReviewChanges(activeIndex, activeMessage);
    },
    [loadMessageInitialState, onReviewChanges, overlay, overlayRef]
  );

  const handleSubMessageCustomButton = useCallback(
    async (info: unknown) => {
      if (!overlay || !overlayRef.current) return;

      const { messageIndex, buttonKey } = info as MessageCustomButtonResponse;
      const messages = (await overlay.getMessages())?.messages;
      const message = messages[messageIndex];
      const assistantMessage =
        messages[messageIndex + 1]?.role === Role.Assistant
          ? messages[messageIndex + 1]
          : undefined;
      const isLastUserMessage =
        messageIndex === messages.length - 2 && message.role === Role.User;

      if (!message) return;

      switch (buttonKey) {
        case viewButtonKey: {
          onReviewChanges(messageIndex, message);
          break;
        }
        case hideButtonKey: {
          const shouldSwitchToAnotherPlaybackMessage =
            selectedConversation?.isPlayback &&
            messageIndex !== aiPreviewMessageIndex;

          if (shouldSwitchToAnotherPlaybackMessage) {
            onReviewChanges(messageIndex, message);
          } else {
            exitAIPreview();
          }
          break;
        }
        case focusButtonKey: {
          const focusColumns = getFocusColumns([message]);
          const focusedTable = focusColumns[focusColumns.length - 1];

          if (!sheetName || !focusedTable) break;

          openField(
            focusedTable.sheetName ?? sheetName,
            escapeTableName(focusedTable.tableName),
            focusedTable.columnName
          );

          break;
        }
        case regenerateButtonKey: {
          const suggestions = getSuggestions([message]);
          const hasState = !!suggestions.length;

          if (!hasState || isProjectReadonly) {
            if (isAIPreview) {
              exitAIPreview();
            }
            if (isAIPendingChanges) {
              discardPendingChanges(false);
            }

            const lastUserMessage = await discardUserMessage();
            if (!lastUserMessage) return;
            sendAssistantStatusMessage(messages, 'DISCARDED');

            overlay.sendMessage(lastUserMessage.content);

            return;
          }

          if (!isAIPreview && !isAIPendingChanges) {
            sendAssistantStatusMessage(messages, 'DISCARDED');

            revertMessageChanges(message);
            const messageInitialState = getInitialState([message]);
            await setSystemPrompt({
              projectSheetsState: messageInitialState?.projectState.sheets,
            });
            const lastUserMessage = await discardUserMessage();
            if (!lastUserMessage) return;
            await overlay?.sendMessage(lastUserMessage.content);

            return;
          }

          if (isAIPreview) {
            sendAssistantStatusMessage(messages, 'DISCARDED');

            exitAIPreview();
            setTimeout(async () => {
              revertMessageChanges(message);
              const messageInitialState = getInitialState([message]);
              await setSystemPrompt({
                projectSheetsState: messageInitialState?.projectState.sheets,
              });
              const lastUserMessage = await discardUserMessage();
              if (!lastUserMessage) return;
              await overlay?.sendMessage(lastUserMessage.content);
            }, 0);

            return;
          }

          if (isAIPendingChanges) {
            discardPendingChanges(false);
            const messageInitialState = getInitialState([message]);
            await setSystemPrompt({
              projectSheetsState: messageInitialState?.projectState.sheets,
            });
            const lastUserMessage = await discardUserMessage();
            if (!lastUserMessage) return;
            await overlay?.sendMessage(lastUserMessage.content);

            return;
          }

          break;
        }
        case deleteButtonKey: {
          if (!assistantMessage || !projectSheets) return;

          const suggestions = getSuggestions([assistantMessage]);
          const hasState = !!suggestions.length;

          if (!hasState || !isLastUserMessage) {
            discardUserMessage(messageIndex);

            return;
          }

          if (isAIPendingChanges) {
            discardPendingChanges(false);
            await discardUserMessage();

            return;
          }

          const discardedMessage = await discardUserMessage();
          if (!discardedMessage) return;

          const suggestionSheets = suggestions.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.dsl;

            return acc;
          }, {} as Record<string, string>);
          const sheets =
            (beforeTemporaryState?.sheets ?? projectSheets).reduce(
              (acc, curr) => {
                acc[curr.sheetName] = curr.content;

                return acc;
              },
              {} as Record<string, string>
            ) ?? {};
          const suggestionsSameAsState =
            isEqual(Object.keys(suggestionSheets), Object.keys(sheets)) &&
            Object.entries(suggestionSheets).every(
              ([key, value]) => value.trim() === sheets[key].trim()
            );
          const isSuggestionIsProjectState =
            assistantMessage &&
            assistantMessage.responseId ===
              responseIds[responseIds.length - 1]?.responseId &&
            suggestionsSameAsState;

          if (isAIPreview) {
            exitAIPreview();
            if (isSuggestionIsProjectState) {
              revertMessageChanges(assistantMessage);
            }

            return;
          }

          if (isSuggestionIsProjectState) {
            revertMessageChanges(assistantMessage);
          }

          break;
        }
        case copyButtonKey: {
          const messageContent = message.content;
          if (!navigator.clipboard || !navigator.clipboard.writeText) {
            return;
          }

          navigator.clipboard.writeText(messageContent).then(() => {
            setIsMessageCopied(true);

            setTimeout(() => {
              setIsMessageCopied(false);
            }, 2000);
          });

          break;
        }
      }
    },
    [
      overlay,
      overlayRef,
      onReviewChanges,
      selectedConversation?.isPlayback,
      aiPreviewMessageIndex,
      exitAIPreview,
      sheetName,
      openField,
      discardUserMessage,
      isProjectReadonly,
      isAIPreview,
      isAIPendingChanges,
      sendAssistantStatusMessage,
      discardPendingChanges,
      revertMessageChanges,
      setSystemPrompt,
      projectSheets,
      beforeTemporaryState?.sheets,
      responseIds,
    ]
  );

  const handleSubEditMessage = useCallback(
    async (payload: unknown) => {
      if (!overlay || !overlayRef.current) return;

      if (!isAIEditPendingChanges) return;

      const typedPayload = payload as EditMessageEventResponse;
      if (
        typedPayload.editedMessage.role === Role.Assistant &&
        isMajorChangedAIAnswer
      ) {
        setIsMajorEditManualEdit(true);
        setIsMajorChangedAIAnswer(false);
        setAIProjectHashes(null);
      }
    },
    [isAIEditPendingChanges, isMajorChangedAIAnswer, overlay, overlayRef]
  );

  const handleSubStopGenerating = useCallback(async () => {
    if (!overlay || !overlayRef.current || !isGenerating) return;

    const { messages } = await overlay.getMessages();
    sendAssistantStatusMessage(messages, 'DISCARDED');

    const lastUserMessage = await discardUserMessage();
    if (!lastUserMessage) return;

    overlay.setInputContent(lastUserMessage.content);
  }, [
    discardUserMessage,
    isGenerating,
    overlay,
    overlayRef,
    sendAssistantStatusMessage,
  ]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.gptStartGenerating}`,
      handleSubStartGenerating
    );

    return () => unsubscribe();
  }, [handleSubStartGenerating, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.gptEndGenerating}`,
      handleSubEndGenerating
    );

    return () => unsubscribe();
  }, [handleSubEndGenerating, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.selectedConversationLoaded}`,
      handleSubSelectedConversationLoaded
    );

    return () => unsubscribe();
  }, [handleSubSelectedConversationLoaded, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const conversationsUpdatedSubject = new Subject<void>();
    const subscription = conversationsUpdatedSubject
      .pipe(
        throttleTime(conversationsUpdatedDebounceTime, undefined, {
          leading: true,
          trailing: true,
        })
      )
      .subscribe(handleSubConversationsUpdated);

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.conversationsUpdated}`,
      () => conversationsUpdatedSubject.next()
    );

    return () => {
      unsubscribe();
      subscription.unsubscribe();
    };
  }, [handleSubConversationsUpdated, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.messageCustomButton}`,
      handleSubMessageCustomButton
    );

    return () => unsubscribe();
  }, [handleSubMessageCustomButton, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.editMessage}`,
      handleSubEditMessage
    );

    return () => unsubscribe();
  }, [handleSubEditMessage, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.stopGenerating}`,
      handleSubStopGenerating
    );

    return () => unsubscribe();
  }, [handleSubStopGenerating, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.prevPlaybackMessage}`,
      handleSubPrevPlaybackMessage
    );

    return () => unsubscribe();
  }, [handleSubPrevPlaybackMessage, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    const unsubscribe = overlay.subscribe(
      `@DIAL_OVERLAY/${OverlayEvents.nextPlaybackMessage}`,
      handleSubNextPlaybackMessage
    );

    return () => unsubscribe();
  }, [handleSubNextPlaybackMessage, overlay, overlayRef]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    try {
      if (!overlayInitialized.current) {
        handleInitOverlay(overlay);
        overlayInitialized.current = true;
      }
    } catch (error) {
      // avoid localhost unhandled errors
    }
  }, [handleInitOverlay, overlay, overlayRef]);

  const destroyChatOverlay = useCallback(() => {
    if (!overlayRef.current) return;

    try {
      overlayRef.current.destroy();
    } catch {
      // Empty catch
    }
    overlayRef.current = null;
    setOverlay(null);
  }, [overlayRef, setOverlay]);

  const createChatOverlay = useCallback(() => {
    if (!canInitOverlay) return;
    if (overlayRef.current || !overlayHostElement) return;

    const options = getOverlayOptions();
    const overlayInstance = new ChatOverlay(overlayHostElement, options);

    overlayInstance.ready().then(() => {
      overlayRef.current = overlayInstance;
      setOverlay(overlayInstance);
    });
  }, [
    canInitOverlay,
    getOverlayOptions,
    overlayHostElement,
    overlayRef,
    setOverlay,
  ]);

  const attachOverlay = useCallback((el: HTMLElement | null) => {
    setOverlayHostElement(el);
  }, []);

  useEffect(
    () => {
      if (!overlayHostElement) return;

      createChatOverlay();

      return () => {
        destroyChatOverlay();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overlayHostElement]
  );

  // Set sheets state from the current project into the system prompt, so the gpt knows about sheets
  useEffect(() => {
    if (
      !overlayHostElement ||
      !overlay ||
      !overlayRef.current ||
      !projectSheets ||
      !sheetName ||
      !projectName ||
      !gridApi
    )
      return;

    try {
      setSystemPrompt();
    } catch (error) {
      // avoid localhost unhandled errors
    }

    const subscription = gridApi.selection$
      .pipe(debounceTime(selectionUpdateDebounceTime))
      .subscribe(() => {
        try {
          setSystemPrompt();
        } catch (error) {
          // avoid localhost unhandled errors
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    projectBucket,
    projectPath,
    projectSheets,
    overlay,
    inputs,
    sheetName,
    projectName,
    gridApi,
    setSystemPrompt,
    overlayRef,
    overlayHostElement,
  ]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    updateCustomButtons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parsedSheet,
    selectedConversation,
    updateCustomButtons,
    isAIPreview,
    isAIPendingChanges,
  ]);

  useEffect(() => {
    if (!overlay || !overlayRef.current) return;

    overlay.setOverlayOptions(getOverlayOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOverlayOptions]);

  useEffect(() => {
    if (!isAIEditPendingChanges) {
      setAIProjectHashes(null);

      return;
    }

    setAIProjectHashes(projectHashes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIEditPendingChanges]);

  useEffect(() => {
    if (!isAIPendingChangesRef.current || !isAIEditPendingChanges) {
      setIsProjectChangedDuringPendingAIChanges(false);

      return;
    }

    // We need to skip first change of sheet content after regenerate summary
    if (!aiProjectHashes) return;

    setIsProjectChangedDuringPendingAIChanges(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetContent]);

  useEffect(() => {
    if (!isAIPendingChangesRef.current || !isAIEditPendingChanges) return;

    // We need update project hashes on hashes updates if not set
    if (!aiProjectHashes) {
      setAIProjectHashes(projectHashes);

      return;
    }

    if (!isProjectChangedDuringPendingAIChanges) return;

    const isChanged = !isEqual(aiProjectHashes, projectHashes);
    if (isChanged) {
      setIsMajorChangedAIAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectHashes]);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isAIPendingChangesRef.current && !isAIPreview) return;

      const isUndo = shortcutApi.is(Shortcut.UndoAction, event);
      const isRedo = shortcutApi.is(Shortcut.RedoAction, event);
      if (isUndo && isRedo) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      }
    },
    [isAIPendingChangesRef, isAIPreview]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeydown, true);

    return () => {
      window.removeEventListener('keydown', onKeydown, true);
    };
  }, [onKeydown]);

  const value = useMemo(
    () => ({
      attachOverlay,
      createConversation,
      createPlayback,
      isReadOnlyProjectChats,
      GPTSuggestions: GPTSuggestions,
      focusColumns: focusColumns,
      overlay,
      projectConversations,
      userLocalConversations,
      selectedConversation,
      answerIsGenerating: isGenerating,

      onApplySuggestion,

      isAIPendingChanges,
      discardPendingChanges,
      acceptPendingChanges,

      isMajorChangedAIAnswer,
      regenerateSummary,

      isAIEditPendingChanges,
      updateAIEditPendingChanges,

      isAIPreview,
      exitAIPreview,

      isConversationsLoading,

      renameConversation,
    }),
    [
      attachOverlay,
      createConversation,
      createPlayback,
      isReadOnlyProjectChats,
      GPTSuggestions,
      focusColumns,
      overlay,
      projectConversations,
      userLocalConversations,
      selectedConversation,
      isGenerating,
      onApplySuggestion,
      isAIPendingChanges,
      discardPendingChanges,
      acceptPendingChanges,
      isMajorChangedAIAnswer,
      regenerateSummary,
      isAIEditPendingChanges,
      updateAIEditPendingChanges,
      isAIPreview,
      exitAIPreview,
      isConversationsLoading,
      renameConversation,
    ]
  );

  return (
    <ChatOverlayContext.Provider value={value}>
      {children}
    </ChatOverlayContext.Provider>
  );
}
