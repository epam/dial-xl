import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounceTime } from 'rxjs';

import {
  ChatOverlay,
  ChatOverlayOptions,
  Feature,
  GetMessagesResponse,
  SelectedConversationLoadedResponse,
} from '@epam/ai-dial-overlay';
import {
  AppTheme,
  bindConversationsRootFolder,
  getSuggestions,
  GPTSuggestion,
  projectFoldersRootPrefix,
} from '@frontend/common';

import {
  ApiContext,
  AppContext,
  InputsContext,
  LayoutContext,
  ProjectContext,
} from '../../../context';
import { useGridApi } from '../../../hooks';
import {
  getProjectSelectedConversations,
  setSelectedConversations,
} from '../../../services';
import { constructPath, encodeApiUrl } from '../../../utils';

function getOverlayOptions(
  theme: AppTheme,
  conversationsFolderId: string | undefined
): ChatOverlayOptions {
  return {
    hostDomain: window.location.origin,
    domain: window.externalEnv.dialOverlayUrl || '',
    theme: theme === AppTheme.ThemeLight ? 'light' : 'dark',
    modelId: window.externalEnv.qgBotDeploymentName,
    newConversationsFolderId: conversationsFolderId,
    requestTimeout: 20000,
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
    enabledFeatures: [
      Feature.ConversationsSection,
      Feature.PromptsSection,
      Feature.TopSettings,
      Feature.TopClearConversation,
      Feature.TopChatInfo,
      Feature.TopChatModelSettings,
      Feature.EmptyChatSettings,
      Feature.Header,
      Feature.Footer,
      Feature.RequestApiKey,
      Feature.ReportAnIssue,
      Feature.Likes,
      Feature.AttachmentsManager,
      Feature.InputFiles,
      Feature.ConversationsSharing,
      Feature.Marketplace,
      Feature.SkipFocusChatInputOnLoad,
    ],
  };
}

const selectionUpdateDebounceTime = 250;

export function useOverlay(containerRef: RefObject<HTMLDivElement>) {
  const {
    projectSheets,
    sheetName,
    projectName,
    projectPath,
    projectBucket,
    selectedCell,
  } = useContext(ProjectContext);
  const { inputs } = useContext(InputsContext);
  const { userBucket } = useContext(ApiContext);
  const { theme, isChatOpen, chatWindowPlacement } = useContext(AppContext);
  const { openedPanels } = useContext(LayoutContext);
  const gridApi = useGridApi();

  const subscriptions = useRef<(() => void)[]>([]);

  const [overlay, setOverlay] = useState<ChatOverlay | null>(null);

  const [GPTSuggestions, setGPTSuggestions] = useState<GPTSuggestion[] | null>(
    null
  );

  const [lastStageCompleted, setLastStageCompleted] = useState(false);

  const shouldInitOverlay = useMemo(
    () =>
      isChatOpen ||
      (chatWindowPlacement === 'panel' && openedPanels.chat.isActive) ||
      !!overlay,
    [chatWindowPlacement, isChatOpen, openedPanels.chat.isActive, overlay]
  );

  const clearSuggestions = useCallback(() => {
    setGPTSuggestions(null);
    setLastStageCompleted(false);
  }, []);

  const projectConversationPath = useMemo(
    () =>
      constructPath([bindConversationsRootFolder, projectPath, projectName]),
    [projectName, projectPath]
  );

  const conversationsFolderId = useMemo(
    () =>
      constructPath(['conversations', projectBucket, projectConversationPath]),
    [projectBucket, projectConversationPath]
  );

  const updateSuggestions = useCallback(
    async (overlayInstance: ChatOverlay) => {
      if (!overlayInstance) return;

      const { messages } =
        (await overlayInstance.getMessages()) as GetMessagesResponse;

      const { isCompleted, suggestions } = getSuggestions(messages);

      setLastStageCompleted(isCompleted);

      setGPTSuggestions(suggestions);
    },
    []
  );

  const handleInitOverlay = useCallback(
    async (overlay: ChatOverlay) => {
      if (!projectName || !projectBucket || !overlay) return;

      const savedSelectedConversations = getProjectSelectedConversations(
        projectName,
        projectBucket,
        projectPath
      );

      const { conversations } = await overlay.getConversations();
      const allConversationsIds = conversations.map(({ id }) => id);
      const isAllExists = savedSelectedConversations.every((id) =>
        allConversationsIds.includes(id)
      );

      if (savedSelectedConversations.length > 0 && isAllExists) {
        const selectedConversationId = savedSelectedConversations[0];
        overlay.selectConversation(selectedConversationId);
        setSelectedConversations(
          [selectedConversationId],
          projectName,
          projectBucket,
          projectPath
        );

        return;
      }

      const projectConversations = conversations.filter(
        ({ folderId }) => folderId === conversationsFolderId
      );

      if (projectConversations.length) {
        overlay.selectConversation(projectConversations[0].id);
        setSelectedConversations(
          [projectConversations[0].id],
          projectName,
          projectBucket,
          projectPath
        );

        return;
      }

      if (userBucket === projectBucket) {
        await overlay.createConversation(projectConversationPath);

        return;
      }
    },
    [
      conversationsFolderId,
      projectBucket,
      projectConversationPath,
      projectName,
      projectPath,
      userBucket,
    ]
  );

  useEffect(() => {
    if (!shouldInitOverlay || !projectName || !projectBucket || !overlay)
      return;

    try {
      handleInitOverlay(overlay);
    } catch (error) {
      // avoid localhost unhandled errors
    }

    const unsubscribeStartGenerating = overlay.subscribe(
      `@DIAL_OVERLAY/GPT_START_GENERATING`,
      clearSuggestions
    );

    const unsubscribeEndGenerating = overlay.subscribe(
      `@DIAL_OVERLAY/GPT_END_GENERATING`,
      async () => updateSuggestions(overlay)
    );

    const unsubscribeSelectConversation = overlay.subscribe(
      `@DIAL_OVERLAY/SELECTED_CONVERSATION_LOADED`,
      async (payload: unknown) => {
        const { selectedConversationIds } =
          payload as SelectedConversationLoadedResponse;
        setSelectedConversations(
          selectedConversationIds,
          projectName,
          projectBucket,
          projectPath
        );

        clearSuggestions();
        updateSuggestions(overlay);
      }
    );

    subscriptions.current?.push(
      unsubscribeEndGenerating,
      unsubscribeStartGenerating,
      unsubscribeSelectConversation
    );

    return () => {
      subscriptions.current.forEach((unsubscribe) => unsubscribe());
      subscriptions.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, projectName, shouldInitOverlay]);

  // Initialize the overlay and subscribe to events
  useEffect(() => {
    if (!shouldInitOverlay || !containerRef.current || !conversationsFolderId)
      return;

    const options = getOverlayOptions(
      theme,
      userBucket === projectBucket ? conversationsFolderId : undefined
    );

    const newOverlay = new ChatOverlay(containerRef.current, options);

    newOverlay.ready().then(() => {
      setOverlay(newOverlay);
    });

    return () => {
      subscriptions.current.forEach((unsubscribe) => unsubscribe());
      subscriptions.current = [];
      newOverlay.destroy();

      setOverlay(null);
    };
  }, [
    containerRef,
    theme,
    shouldInitOverlay,
    conversationsFolderId,
    userBucket,
    projectBucket,
  ]);

  // Set sheets state from the current project into the system prompt, so the gpt knows about sheets
  useEffect(() => {
    if (
      !shouldInitOverlay ||
      !overlay ||
      !projectSheets ||
      !sheetName ||
      !projectName ||
      !gridApi
    )
      return;

    const sheets: { [key: string]: string } = {};

    for (const sheet of projectSheets) {
      sheets[sheet.sheetName] = sheet.content;
    }

    const handleUpdate = () => {
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
        sheets,
        inputs,
        inputFolder,
        currentSheet: sheetName,
        currentProjectName,
        selection,
        selectedTableName: selectedCell?.tableName,
      };

      overlay.setSystemPrompt(JSON.stringify(state));
    };

    try {
      handleUpdate();
    } catch (error) {
      // avoid localhost unhandled errors
    }

    const subscription = gridApi.selection$
      .pipe(debounceTime(selectionUpdateDebounceTime))
      .subscribe(() => {
        try {
          handleUpdate();
        } catch (error) {
          // avoid localhost unhandled errors
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    shouldInitOverlay,
    projectBucket,
    projectPath,
    projectSheets,
    overlay,
    inputs,
    sheetName,
    projectName,
    gridApi,
    selectedCell,
  ]);

  return { GPTSuggestions, lastStageCompleted };
}
