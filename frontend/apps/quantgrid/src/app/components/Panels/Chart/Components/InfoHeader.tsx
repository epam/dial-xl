import { Tooltip } from 'antd';

import Icon from '@ant-design/icons';
import { QuestionIcon } from '@frontend/common';

export function InfoHeader({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center">
      <span>{title}</span>
      <Tooltip placement="bottom" title={info} destroyOnHidden>
        <Icon
          className="w-[18px] text-text-secondary ml-1 hover:text-text-accent-primary"
          component={() => <QuestionIcon />}
        />
      </Tooltip>
    </div>
  );
}
