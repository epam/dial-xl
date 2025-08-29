import { chartRowNumberSelector, GridChart } from '@frontend/common';

export function filterSelectorNames(gridChart: GridChart) {
  return gridChart.selectorFieldNames.filter((selector) => {
    if (selector !== chartRowNumberSelector) return true;

    return (
      gridChart.availableKeys[selector] &&
      gridChart.availableKeys[selector].length > 1
    );
  });
}
