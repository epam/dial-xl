import {
  gridDataContainerClass,
  tableHeaderButtonsContainerClass,
  tableHeaderTitleClass,
} from '../../../constants';

export function setTableHeaderPointerEvents(enable: boolean) {
  const elements = document.querySelectorAll(
    `.${tableHeaderTitleClass}, .${gridDataContainerClass} button, .${tableHeaderButtonsContainerClass}`
  ) as NodeListOf<HTMLElement>;

  elements.forEach((el) => (el.style.pointerEvents = enable ? 'auto' : 'none'));
}
