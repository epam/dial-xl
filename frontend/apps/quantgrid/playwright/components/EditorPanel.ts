import { Page } from '@playwright/test';

import { BasePanel } from './BasePanel';
import { Editor } from './Editor';

export class EditorPanel extends BasePanel {
  private editor: Editor;

  private monacoEditor = 'div.monaco-editor';

  constructor(page: Page) {
    super(page);
    this.panelName = 'Editor';
    this.editor = new Editor(page, page.locator(this.monacoEditor).last());
  }

  public getEditor() {
    return this.editor;
  }
}
