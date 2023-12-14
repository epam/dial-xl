import { Button } from 'antd';

import {
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';

type Props = {
  sortAsc: boolean;
  onSortChange: () => void;
};

export function DashboardProjectsBar({ sortAsc, onSortChange }: Props) {
  return (
    <div className="mt-8 mx-[20%]">
      <div className="flex justify-between">
        <span className="font-bold">All projects</span>
        <div>
          <Button
            className="flex items-center justify-center text-xl"
            icon={
              sortAsc ? <SortAscendingOutlined /> : <SortDescendingOutlined />
            }
            type="text"
            onClick={onSortChange}
          />
        </div>
      </div>
    </div>
  );
}
