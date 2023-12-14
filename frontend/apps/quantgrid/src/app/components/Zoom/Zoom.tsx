import { Select } from 'antd';
import { useCallback, useContext } from 'react';

import { AppContext, zoomValues } from '../../context';

export function Zoom() {
  const { updateZoom, zoom } = useContext(AppContext);

  const onChange = useCallback(
    (zoom: number) => {
      updateZoom(zoom);
    },
    [updateZoom]
  );

  return (
    <Select
      className="mr-2 w-32"
      options={zoomValues.map((zoom) => ({
        label: zoom * 100 + '%',
        value: zoom,
      }))}
      value={zoom}
      onChange={onChange}
    />
  );
}
