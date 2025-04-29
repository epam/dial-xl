import Icon from '@ant-design/icons';
import { ZoomCancelIcon } from '@frontend/common';

export function EmptySearchResults() {
  return (
    <div className="grow flex flex-col justify-center items-center">
      <Icon
        className="w-[60px] text-textSecondary"
        component={() => <ZoomCancelIcon />}
      ></Icon>
      <span className="text-base text-textPrimary mt-4">No items found</span>
    </div>
  );
}
