import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { PlusIcon, publicBucket } from '@frontend/common';

import { ApiContext, InputsContext } from '../../../context';

export function InputUpload() {
  const { isAdmin } = useContext(ApiContext);
  const { inputsBucket, uploadFiles } = useContext(InputsContext);

  return (
    <div className="w-full p-1 border-b border-b-strokeTertiary flex flex-col">
      <button
        className="group flex items-center rounded-[3px] text-textPrimary py-1 px-2 hover:bg-bgAccentPrimaryAlpha disabled:hover:bg-inherit disabled:text-controlsTextDisable disabled:cursor-not-allowed"
        disabled={!inputsBucket || (!isAdmin && inputsBucket === publicBucket)}
        onClick={() => uploadFiles()}
      >
        <Icon
          className="w-[12px] stroke-textSecondary mr-2 group-disabled:stroke-controlsTextDisable"
          component={() => <PlusIcon />}
        />
        <span className="text-[13px] leading-[14px]">Upload file</span>
      </button>
    </div>
  );
}
