import classNames from 'classnames';

import { FieldItem } from '../utils';

export const DraggingItem = ({ item }: { item: FieldItem }) => (
  <div
    className={classNames(
      'w-[250px] px-3 py-2 mb-1 rounded-sm text-[13px] flex items-center justify-between',
      'border border-borderPrimary bg-bgHighlight shadow-md z-50'
    )}
  >
    <span className="truncate font-medium">{item.name}</span>
  </div>
);
