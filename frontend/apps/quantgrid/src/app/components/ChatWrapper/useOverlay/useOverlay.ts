import { RefObject, useContext, useEffect, useState } from 'react';

import { InputsContext, ProjectContext } from '../../../context';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ChatOverlay } from './overlay.js';

function getOverlayOptions() {
  return {
    hostDomain: window.location.origin,
    domain: window.externalEnv.dialOverlayUrl || 'url_not_set',
    theme: 'light',
    modelId: 'qg',
    requestTimeout: 20000,
    loaderStyles: {
      padding: '20px',
      textAlign: 'center',
    },
    enabledFeatures:
      'conversations-section,prompts-section,top-settings,top-clear-conversation,top-chat-info,top-chat-model-settings,empty-chat-settings,header,footer,request-api-key,report-an-issue,likes',
  };
}

function getSheetNameFromTitle(title: string): string | undefined {
  const firstBracketIndex = title.indexOf('(');
  const lastBracketIndex = title.indexOf(')');

  if (firstBracketIndex === -1 || lastBracketIndex === -1) return;

  return title.slice(firstBracketIndex + 1, lastBracketIndex);
}

function prepareDSL(data: string) {
  if (data.slice(0, 3) === '```') {
    // 4, because 1 symbol in data is \n
    return data.slice(4, data.length - 3);
  }

  return data;
}

export function useOverlay(containerRef: RefObject<HTMLDivElement>) {
  const { projectSheets } = useContext(ProjectContext);
  const { inputs } = useContext(InputsContext);

  const [overlay, setOverlay] = useState<ChatOverlay | null>(null);

  const [GPTSuggestions, setGPTSuggestions] = useState<
    | {
        sheetName?: string; // if there is no sheetName in title that mean we should update current sheet
        dsl: string;
      }[]
    | null
  >(null);

  // Initialize the overlay and subscribe to events
  useEffect(() => {
    if (!containerRef.current) return;

    const options = getOverlayOptions();

    const overlay = new ChatOverlay(containerRef.current, options);

    overlay.ready().then(() => {
      setOverlay(overlay);
    });

    const unsubscribeStartGenerating = overlay.subscribe(
      '@DIAL_OVERLAY/GPT_START_GENERATING',
      () => {
        setGPTSuggestions(null);
      }
    );

    const unsubscribeEndGenerating = overlay.subscribe(
      '@DIAL_OVERLAY/GPT_END_GENERATING',
      async () => {
        const { messages } = await overlay.getMessages();

        if (!messages.length) return;

        const lastAnswer = messages[messages.length - 1];

        const attachments = lastAnswer?.custom_content?.attachments;

        if (!attachments) return;

        const suggestions = [];

        for (const { data, title } of attachments) {
          if (typeof data === 'string') {
            const sheetName = getSheetNameFromTitle(title || '');

            suggestions.push({ sheetName, dsl: prepareDSL(data) });
          }
        }

        setGPTSuggestions(suggestions);
      }
    );

    return () => {
      unsubscribeEndGenerating();
      unsubscribeStartGenerating();
      overlay.destroy();
    };
  }, [containerRef]);

  // Set sheets state from the current project into the system prompt, so the gpt knows about sheets
  useEffect(() => {
    if (!overlay || !projectSheets) return;

    const sheets: { [key: string]: string } = {};

    for (const sheet of projectSheets) {
      sheets[sheet.sheetName] = sheet.content;
    }

    overlay.setSystemPrompt(JSON.stringify({ sheets, inputs }));
  }, [projectSheets, overlay, inputs]);

  return { GPTSuggestions };
}
