import { AIPromptWrapperId } from '../../constants';
import { getPx } from '../../utils';

export const updateAIPromptViewport = (root: HTMLElement) => {
  const AIPromptWrapper = document.getElementById(AIPromptWrapperId);

  if (!AIPromptWrapper) return;

  const { scrollTop, scrollLeft } = root;

  const dataTop = AIPromptWrapper.getAttribute('data-top');
  const dataLeft = AIPromptWrapper.getAttribute('data-left');
  const dataInitialScrollTop = AIPromptWrapper.getAttribute(
    'data-initial-scroll-top'
  );
  const dataInitialScrollLeft = AIPromptWrapper.getAttribute(
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

  AIPromptWrapper.style.top = getPx(top);
  AIPromptWrapper.style.left = getPx(left);
};
