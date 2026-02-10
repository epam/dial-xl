import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

interface SSEParserOptions {
  /** Called for parsed JSON events.  */
  onData?: (data: any) => void;
  /** Called for control tokens like [DONE], [ERROR], etc. */
  onControl?: (token: string) => void;

  /**
   * If true, ignore non-JSON frames (don’t throw) and send bracketed tokens to onControl.
   * If false, JSON.parse errors will throw and cancel the reader.
   * Default: false (strict).
   */
  tolerant?: boolean;

  /**
   * If true, stop feeding the parser when [DONE] is received.
   * If false, reset the internal parser and keep reading.
   * Default: true.
   */
  stopOnDone?: boolean;

  /**
   * If true, cancel the reader on unexpected errors.
   * Default: matches !tolerant (strict cancels, tolerant doesn’t).
   */
  cancelOnError?: boolean;
}

const doneEvent = '[DONE]';
const errorEvent = '[ERROR]';

export async function parseSSEResponse(
  response: Response,
  options: SSEParserOptions = {},
  controller?: AbortController
): Promise<void> {
  const {
    onData,
    onControl,
    tolerant = false,
    stopOnDone = true,
    cancelOnError = !tolerant,
  } = options;

  if (!response.body) return;

  let shouldStop = false;
  let needCancel = false;

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type !== 'event') return;

    const raw = (event as ParsedEvent).data ?? '';
    const trimmed = typeof raw === 'string' ? raw.trim() : '';

    // Control tokens (e.g., [DONE], [ERROR]) — only in tolerant mode or if it's [DONE]
    if (trimmed && trimmed.startsWith('[') && trimmed.endsWith(']')) {
      // Always notify about [DONE]; notify other tokens only in tolerant mode
      if (trimmed === doneEvent || tolerant) {
        onControl?.(trimmed);
      }
      if (trimmed === doneEvent) {
        if (stopOnDone) {
          shouldStop = true;
          needCancel = true;
        } else {
          parser.reset();
        }
      }

      if (trimmed === errorEvent && !tolerant) {
        throw new Error('Error event received');
      }

      return;
    }

    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed);
      onData?.(parsed);
    } catch (e) {
      if (tolerant) {
        // swallow non-JSON noise in tolerant mode
        return;
      }
      // strict mode: rethrow to be handled in the outer try/catch
      throw e;
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
        needCancel = true;

        return;
      }
      if (shouldStop) {
        return;
      }

      const { done, value } = await reader.read();
      if (done) return;

      parser.feed(decoder.decode(value, { stream: true }));
    }
  } catch (error) {
    // In strict mode: cancel the reader and rethrow.
    // In tolerant mode, don’t cancel; release lock and return quietly.
    if (cancelOnError) {
      needCancel = true;
      throw error;
    } else {
      return;
    }
  } finally {
    try {
      if (needCancel) {
        await reader.cancel('Stopped SSE reader');
      } else {
        reader.releaseLock?.();
      }
    } catch {
      // empty block
    }
  }
}
