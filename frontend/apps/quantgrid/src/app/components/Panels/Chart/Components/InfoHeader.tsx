import { Tooltip } from 'antd';

import Icon from '@ant-design/icons';
import { QuestionIcon } from '@frontend/common';

export function InfoHeader({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center">
      <span>{title}</span>
      <Tooltip placement="bottom" title={info}>
        <Icon
          className="w-[18px] text-textSecondary ml-1 hover:text-textAccentPrimary"
          component={() => <QuestionIcon />}
        />
      </Tooltip>
    </div>
  );
}
