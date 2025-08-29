import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

interface SSEParserOptions {
  onData: (data: any) => void;
}

const doneEvent = '[DONE]';

export async function parseSSEResponse(
  response: Response,
  { onData }: SSEParserOptions,
  controller?: AbortController
): Promise<void> {
  if (!response.body) return;

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    const isEvent = event.type === 'event';
    if (isEvent && event.data === doneEvent) {
      parser.reset();

      return;
    }

    if (isEvent) {
      const parsedData = JSON.parse(event.data);
      onData(parsedData);
    }
  };

  const parser = createParser(onParse);
  const decoder = new TextDecoder();

  if (controller?.signal.aborted) return;

  // There is an issue in types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const reader = response.body.getReader();

  try {
    while (true) {
      if (controller?.signal.aborted) {
        return;
      }

      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      parser.feed(decoder.decode(value));
    }
  } catch (error) {
    reader.cancel('Error during stream processing').catch(() => {
      // ignore, do not show console errors
    });
    throw error;
  }
}
