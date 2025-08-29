import { Dropdown, MenuProps } from 'antd';
import cx from 'classnames';
import { useContext, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { ChevronDown, getDropdownItem } from '@frontend/common';

import { AppContext, zoomValues } from '../../../context';

const zoomOptions = zoomValues?.map((zoom) => ({
  label: zoom * 100 + '%',
  value: zoom,
}));
export function Zoom() {
  const { updateZoom, zoom } = useContext(AppContext);

  const [isZoomOpened, setIsZoomOpened] = useState(false);
  const [selectedZoom, setSelectedZoom] = useState<{
    label: string;
    value: number;
  }>(zoomOptions[0]);

  useEffect(() => {
    setSelectedZoom(
      zoomOptions.find((z) => z.value === zoom) || zoomOptions[0]
    );
  }, [zoom]);

  const items: MenuProps['items'] = useMemo(
    () =>
      zoomOptions.map((val) =>
        getDropdownItem({
          key: val.value,
          label: val.label,
          onClick: () => updateZoom(val.value),
        })
      ),
    [updateZoom]
  );

  return (
    <div className="flex">
      <Dropdown
        align={{
          offset: [0, 12],
        }}
        className="px-3 h-full min-w-[60px] flex items-center justify-center"
        menu={{ items }}
        open={isZoomOpened}
        onOpenChange={setIsZoomOpened}
      >
        <div className="cursor-pointer flex gap-1 group">
          <span className="text-[13px] text-textPrimary">
            {selectedZoom.label}
          </span>
          <Icon
            className={cx(
              'text-textPrimary w-[18px] transition-all group-hover:text-textAccentPrimary',
              isZoomOpened && 'rotate-180'
            )}
            component={() => <ChevronDown />}
          />
        </div>
      </Dropdown>
    </div>
  );
}
