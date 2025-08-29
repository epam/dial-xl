// The root reason to reexport monaco from esm folder: https://github.com/microsoft/monaco-editor/issues/2874
// There is a bug in the monaco webpack plugin that leads to export all language files (around 100 items)
// to the application bundle. Importing from esm folder is a workaround for this issue.
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
export * as monacoFromNodeModules from 'monaco-editor/esm/vs/editor/editor.api';
