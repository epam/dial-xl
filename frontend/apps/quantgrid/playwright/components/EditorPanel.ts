import { Page } from '@playwright/test';

import { BasePanel } from './BasePanel';
import { Editor } from './Editor';

export class EditorPanel extends BasePanel {
  private editor: Editor;

  //#editor-panel[data-panel-active='true']

  private monacoEditor = 'div.monaco-editor';

  constructor(page: Page) {
    super(page);
    this.panelName = 'editor';
    this.editor = new Editor(page, page.locator(this.monacoEditor).last());
  }

  public getEditor() {
    return this.editor;
  }
}
