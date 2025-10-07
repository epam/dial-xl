// The root reason to reexport monaco from esm folder: https://github.com/microsoft/monaco-editor/issues/2874
// There is a bug in the monaco webpack plugin that leads to export all language files (around 100 items)
// to the application bundle. Importing from esm folder is a workaround for this issue.

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';

export {
  type CancellationToken,
  type IDisposable,
  type IRange,
  type IMarkdownString,
  type IPosition,
  MarkerSeverity,
  editor,
  KeyCode,
  KeyMod,
  Position,
  languages,
  Range,
} from 'monaco-editor/esm/vs/editor/editor.api';

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

export { monaco };
