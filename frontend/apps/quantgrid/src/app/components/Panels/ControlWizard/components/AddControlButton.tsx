import { Button } from 'antd';

import { PlusIcon } from '@frontend/common';

import { ControlRow } from './utils';

type Props = {
  add: (defaultValue?: ControlRow, insertIndex?: number) => void;
};

export function AddControlButton({ add }: Props) {
  return (
    <Button
      className="flex items-center justify-center text-text-accent-primary border-stroke-secondary hover:border-bg-accent-primary"
      icon={
        <div className="w-[16px] ml-2 text-text-accent-primary hover:text-text-accent-primary">
          <PlusIcon />
        </div>
      }
      type="dashed"
      onClick={() =>
        add({
          name: '',
          type: null,
          dependency: null,
          valueTable: null,
          valueField: null,
        })
      }
    >
      Add control
    </Button>
  );
}
