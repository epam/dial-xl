import { cellEditorContainerId, cellEditorWrapperId } from '../../constants';
import { getPx } from '../../utils';

export const updateCellEditorViewport = (root: HTMLElement) => {
  const cellEditorWrapper = document.getElementById(cellEditorWrapperId);
  const cellEditorContainer = document.getElementById(cellEditorContainerId);

  if (!cellEditorContainer || !cellEditorWrapper) return;

  const { scrollTop, scrollLeft } = root;

  const dataTop = cellEditorWrapper.getAttribute('data-top');
  const dataLeft = cellEditorWrapper.getAttribute('data-left');
  const dataInitialScrollTop = cellEditorWrapper.getAttribute(
    'data-initial-scroll-top'
  );
  const dataInitialScrollLeft = cellEditorWrapper.getAttribute(
    'data-initial-scroll-left'
  );

  if (
    !dataTop ||
    !dataLeft ||
    dataInitialScrollTop === null ||
    dataInitialScrollLeft === null
  )
    return;

  const currentTop = parseFloat(dataTop);
  const currentLeft = parseFloat(dataLeft);
  const initialScrollTop = parseFloat(dataInitialScrollTop);
  const initialScrollLeft = parseFloat(dataInitialScrollLeft);

  const top = currentTop - scrollTop + initialScrollTop;
  const left = currentLeft - scrollLeft + initialScrollLeft;

  cellEditorWrapper.style.top = getPx(top);
  cellEditorWrapper.style.left = getPx(left);

  cellEditorContainer.style.left = root.style.left;
};
