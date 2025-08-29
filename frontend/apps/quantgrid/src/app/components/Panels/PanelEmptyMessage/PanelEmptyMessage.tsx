import { ReactNode } from 'react';

import Icon from '@ant-design/icons';

export function PanelEmptyMessage({
  message,
  icon,
}: {
  message: string;
  icon: ReactNode;
}) {
  return (
    <div className="grow justify-center w-full bg-bgLayer3 text-[13px] text-textSecondary flex flex-col items-center pb-1 px-2">
      <Icon className="w-10" component={() => icon} />

      {message}
    </div>
  );
}
