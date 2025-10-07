import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { PlusIcon, publicBucket } from '@frontend/common';

import { ApiContext, InputsContext } from '../../../context';

export function InputUpload() {
  const { isAdmin } = useContext(ApiContext);
  const { inputsBucket, uploadFiles } = useContext(InputsContext);

  return (
    <div className="w-full p-1 border-b border-b-stroke-tertiary flex flex-col">
      <button
        className="group flex items-center rounded-[3px] text-text-primary py-1 px-2 hover:bg-bg-accent-primary-alpha disabled:hover:bg-inherit disabled:text-controls-text-disable disabled:cursor-not-allowed"
        disabled={!inputsBucket || (!isAdmin && inputsBucket === publicBucket)}
        onClick={() => uploadFiles()}
      >
        <Icon
          className="w-[12px] text-text-secondary mr-2 group-disabled:stroke-controls-text-disable"
          component={() => <PlusIcon />}
        />
        <span className="text-[13px] leading-[14px]">Upload file</span>
      </button>
    </div>
  );
}
