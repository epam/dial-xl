import { BasePanel } from './BasePanel';

export class ProjectTree extends BasePanel {
  private nodeTitle = '.ant-tree-title';

  panelName = 'Project';

  public getTreeNode(nodeName: string) {
    return this.innerPage.locator(this.nodeTitle).getByText(nodeName);
  }
}
