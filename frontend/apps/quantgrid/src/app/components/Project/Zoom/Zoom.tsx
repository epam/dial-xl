import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import { SelectClasses } from '@frontend/common';

import { AppContext, zoomValues } from '../../../context';

const zoomOptions = zoomValues?.map((zoom) => ({
  label: zoom * 100 + '%',
  value: zoom,
}));
export function Zoom() {
  const { updateZoom, zoom } = useContext(AppContext);

  const [selectedZoom, setSelectedZoom] = useState<DefaultOptionType>(
    zoomOptions[0]
  );

  useEffect(() => {
    setSelectedZoom(
      zoomOptions.find((z) => z.value === zoom) || zoomOptions[0]
    );
  }, [zoom]);

  const onChange = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      updateZoom(option?.value as number);
    },
    [updateZoom]
  );

  return (
    <div className="min-w-[75px] ml-2 mr-4">
      <Select
        classNames={{
          ...SelectClasses,
          control: () =>
            cx(
              '!bg-bgLayer3 !border-0 hover:!border-none !shadow-none text-[13px]'
            ),
          valueContainer: () => '!pr-0',
        }}
        components={{
          IndicatorSeparator: null,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        name="zoomSelect"
        options={zoomOptions}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }}
        value={selectedZoom}
        onChange={onChange}
      />
    </div>
  );
}
