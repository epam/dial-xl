import { BasePanel } from './BasePanel';

export class ProjectTree extends BasePanel {
  private nodeTitle = '.ant-tree-title';

  private switcherItem(name: string) {
    return `div.ant-tree-treenode:has(span[title='${name}'])>span.ant-tree-switcher`;
  }

  private menuItem(name: string) {
    return `li.ant-dropdown-menu-item:has-text('${name}')`;
  }

  panelName = 'project';

  private openElement = `[data-panel="project"][data-qa="collapsed-panel-button"]`;

  public getTreeNode(nodeName: string) {
    return this.innerPage.locator(this.nodeTitle).getByText(nodeName);
  }

  public async clickOnNode(nodeName: string) {
    return await this.getTreeNode(nodeName).click();
  }

  public async expandItem(name: string) {
    if (
      (
        await this.innerPage
          .locator(this.switcherItem(name))
          .getAttribute('class')
      )?.includes('close')
    ) {
      await this.innerPage.locator(this.switcherItem(name)).click();
    }
  }

  public async selectMenuItem(name: string) {
    return await this.getTreeNode(name).click({ button: 'right' });
  }

  public async showPanel() {
    if (!(await this.isVisible())) {
      await this.innerPage.locator(this.openElement).click();
    }
  }
}
