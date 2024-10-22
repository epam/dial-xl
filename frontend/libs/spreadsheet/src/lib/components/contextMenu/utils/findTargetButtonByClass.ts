import { gridDataContainerClass } from '../../../constants';

export function findTargetButtonByClass(
  event: any,
  className: string[]
): any | null {
  const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

  if (!dataContainer) return;

  let target = event.target;

  while (target && target !== dataContainer) {
    if (target.nodeName === 'BUTTON') {
      for (let i = 0; i < className.length; i++) {
        if (target.classList.contains(className[i])) {
          return target;
        }
      }

      return null;
    }
    target = target.parentNode;
  }
}
