import { Container, inject, injectable, optional } from 'inversify';
import { combineLatest } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import {
  COLUMN_SERVICE,
  COLUMN_STATE_SERVICE,
  CONFIG,
  Destroyable,
  HEADER_CELL_FACTORY,
  ROW_SERVICE,
} from '@deltix/grid-it';
import type {
  GridItOptions,
  IColumnService,
  IColumnStateService,
  IHeader,
  IRowService,
} from '@deltix/grid-it-core';
import {
  appendChild,
  clearNode,
  Column,
  ColumnGroup,
  createElement,
  rebuildTree,
  TreeNode,
} from '@deltix/grid-it-core';

import { HeaderCell } from './headerCell';

import './header.scss';

const GROUP_CLASS_NAME = 'grid-header-group';
const GROUP_CLASS_NAME_CONTENT = 'grid-header-group__content';
const HEADER_CELL_PLACEHOLDER_CLASSNAME = 'grid-cell--header-placeholder';

function adjustGroupContainersSize(groupsContainer: HTMLElement, zoom: number) {
  const found = groupsContainer.querySelectorAll('.' + GROUP_CLASS_NAME);

  found.forEach((foundItem: Element) => {
    const item = foundItem as HTMLElement;
    const cells = item.querySelectorAll(
      '.' + HEADER_CELL_PLACEHOLDER_CLASSNAME
    );
    let width = 0;

    cells.forEach((foundCell: Element) => {
      const cell = foundCell as HTMLElement;
      const cellWidth = cell.style.width;
      if (cellWidth) {
        const numWidth = parseFloat(cellWidth.replace('px', ''));
        width += Math.floor(numWidth * zoom);
      }
    });

    item.style.width = width + 'px';
  });
}

const createContainer = (
  level: number,
  totalHeight: number,
  headerHeight: number
) => {
  const header = createElement('div', {
    classList: ['grid-header-group__header'],
    draggable: false,
  });
  const content = createElement('div', {
    classList: [GROUP_CLASS_NAME_CONTENT],
    draggable: false,
  });

  const container = createElement(
    'div',
    {
      classList: [GROUP_CLASS_NAME, `${GROUP_CLASS_NAME}__level-${level}`],
      draggable: false,
    },
    header,
    content
  );

  if (!totalHeight && !headerHeight) {
    container.style.height = `auto`;
    header.style.height = `auto`;
  } else {
    container.style.height = `${totalHeight}px`;
    header.style.height = `${headerHeight}px`;
  }

  return container;
};

@injectable()
export class Header<T> extends Destroyable implements IHeader {
  protected root: HTMLElement;
  protected groupsContainer: HTMLElement;
  protected cellsContainer: HTMLElement;
  protected cols: Column[] = [];
  protected cells = new WeakMap<Column, HeaderCell<T>>();
  protected tree!: ColumnGroup;
  protected depth = 0;
  protected zoom: number;

  constructor(
    @inject(COLUMN_SERVICE) protected columnService: IColumnService,
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService,
    @inject(HEADER_CELL_FACTORY)
    protected headerCellFactory: () => HeaderCell<T>,
    @inject(CONFIG) protected config: GridItOptions<T>,
    @inject(ROW_SERVICE) protected rowService: IRowService,
    @optional() @inject(Container) protected container: Container
  ) {
    super();

    this.zoom = 1;

    this.groupsContainer = createElement('div', {
      classList: ['grid-header__groups'],
    });
    this.cellsContainer = createElement('div', {
      classList: ['grid-header__cells', 'grid-row', 'grid-row--header'],
    });
    this.root = createElement('div', {
      classList: ['grid-header'],
    });

    appendChild(this.root, this.groupsContainer);
    appendChild(this.root, this.cellsContainer);

    this.rowService.widthWithClones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.setWidth);

    this.columnService.flat$
      .pipe(debounceTime(10), takeUntil(this.destroy$))
      .subscribe((cols) => {
        this.setColumns(cols);
      });

    this.columnService.tree$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tree) => {
        this.tree = tree;
      });

    combineLatest([
      this.rowService.headerRowHeight$,
      this.rowService.headerRowHeightByLevel$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.setColumns(this.cols));
  }

  render() {
    return this.root;
  }

  destroy() {
    this.cols.forEach(this.destroyCell);

    super.destroy();
    this.root.remove();
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.setColumns(this.cols);
  }

  private setWidth = (widthPx: number) => {
    this.root.style.width = `${widthPx}px`;
  };

  protected repopulateCells = (cols: Column[] = this.cols, maxDepth = 0) => {
    clearNode(this.cellsContainer);

    cols.forEach((col) => {
      const cell = this.getHeaderCell(col, maxDepth);
      appendChild(this.cellsContainer, cell.render());
    });
  };

  protected setColumns(cols: Column[]) {
    const prevColumns = new Set(this.cols);
    const [state, depth] = rebuildTree(this.tree, cols);

    this.repopulateCells(cols, depth);

    const columns: [TreeNode, (TreeNode | Column)[], HTMLElement, number][] = [
      [state, state.columns, this.groupsContainer, 0],
    ];

    clearNode(this.groupsContainer);

    this.cols = cols;
    this.depth = depth;

    while (columns.length) {
      const column = columns.shift();

      if (!column) break;

      const [parent, children, root, level] = column;

      if (parent.group?.options?.title) {
        (root.firstChild as HTMLElement).innerText = parent.group.options.title;
      }
      const content = (root.lastChild as HTMLElement) || root;
      for (const child of children) {
        if (child instanceof Column) {
          const placeholderCell = createElement('div', {
            classList: ['grid-cell', HEADER_CELL_PLACEHOLDER_CLASSNAME],
          });
          placeholderCell.style.width = child.width + 'px';
          appendChild(content, placeholderCell);
          prevColumns.delete(child);
        } else {
          const container = createContainer(
            level,
            this.getContainerHeight(depth, level),
            this.rowService.getHeaderRowHeight(level)
          );
          columns.push([child, child.columns, container, level + 1]);
          appendChild(content, container);
        }
      }
    }

    prevColumns.forEach(this.destroyCell);

    adjustGroupContainersSize(this.groupsContainer, this.zoom);
  }

  protected getHeaderCell(column: Column, level: number) {
    let cell = this.cells.get(column);

    if (!cell) {
      cell = this.headerCellFactory();

      this.cells.set(column, cell);
    }

    cell.setColumn(column, this.zoom);

    return cell;
  }

  protected destroyCell = (column: Column) => {
    const cell = this.cells.get(column);
    if (cell) {
      this.cells.delete(column);
      cell?.destroy();
    }
  };

  private getContainerHeight = (depth: number, level: number) => {
    let sum = 0;

    for (let i = level; i < depth; i++) {
      sum += this.rowService.getHeaderRowHeight(i);
    }

    return sum;
  };
}
