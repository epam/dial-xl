import { MouseEvent } from 'react';
import { components } from 'react-select';

import { isDividerOption } from './utils';

export function FilterPanelModeOption({ innerProps, data, ...props }: any) {
  if (data?.value && isDividerOption(data.value)) {
    return <hr className="border-border-secondary my-1" />;
  }

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
    innerProps?.onClick?.(e);
  };

  props.innerProps = { ...innerProps, onClick, onMouseDown: onClick };

  return (
    <components.Option data={data} innerProps={props.innerProps} {...props} />
  );
}
