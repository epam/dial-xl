import { chartsContainerId } from '../../constants';
import { getPx, round } from '../../utils';

export const updateChartsViewport = (
  root: HTMLElement,
  dataContainer: HTMLElement
) => {
  const chartContainer = document.getElementById(chartsContainerId);

  if (chartContainer) {
    const { scrollTop, scrollLeft } = root;

    const dataContainerRect = dataContainer.getBoundingClientRect();

    const top = -scrollTop;
    const left = -scrollLeft;

    chartContainer.style.width = getPx(round(dataContainerRect.width));
    chartContainer.style.height = getPx(round(dataContainerRect.height));

    chartContainer.style.transform = `translate(${left}px, ${top}px)`;
  }
};
