import { Input } from 'antd';
import { useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { inputClasses, QGIconProps } from '@frontend/common';

// eslint-disable-next-line @nx/enforce-module-boundaries
import * as Icons from '../../../../../libs/common/src/lib/icons';

export function IconsPage() {
  const [iconClassname, setIconClassname] = useState(
    'size-10 border rounded text-textAccentPrimary'
  );
  const [iconProps, setIconProps] = useState<QGIconProps>({
    secondaryAccentCssVar: 'text-accent-secondary',
    tertiaryAccentCssVar: 'text-accent-tertiary',
  });

  const allIcons = useMemo(() => Object.entries(Icons), []);
  const chartIcons = useMemo(
    () => allIcons.filter((icon) => icon[0].toLowerCase().includes('chart')),
    [allIcons]
  );
  const otherIcons = useMemo(
    () => allIcons.filter((icon) => !icon[0].toLowerCase().includes('chart')),
    [allIcons]
  );

  const IconTile = (iconName: string, IconComponent: any) => {
    return (
      <div className="w-30" key={iconName} style={{ textAlign: 'center' }}>
        <Icon
          className={iconClassname}
          component={() => <IconComponent {...iconProps} />}
        />

        <p className="text-sm break-words">{iconName}</p>
      </div>
    );
  };

  return (
    <div className="p-5 flex flex-col gap-10 overflow-auto">
      <div className="grid grid-cols-3 gap-5">
        <label>
          Input className (Note: only classes used on other pages will work)
          <Input
            className={inputClasses}
            value={iconClassname}
            onChange={(e) => setIconClassname(e.target.value!)}
          />
        </label>
        <label>
          Secondary accent CSS var
          <Input
            className={inputClasses}
            value={iconProps.secondaryAccentCssVar}
            onChange={(e) =>
              setIconProps((val) => ({
                ...val,
                secondaryAccentCssVar: e.target.value ?? '',
              }))
            }
          />
        </label>
        <label>
          Tertiary accent CSS var
          <Input
            className={inputClasses}
            value={iconProps.tertiaryAccentCssVar}
            onChange={(e) =>
              setIconProps((val) => ({
                ...val,
                tertiaryAccentCssVar: e.target.value ?? '',
              }))
            }
          />
        </label>
      </div>
      <div className="flex flex-col gap-5">
        <h4>Chart icons</h4>
        <div className="grid grid-cols-8 gap-10">
          {chartIcons.map(([iconName, IconComponent]) =>
            IconTile(iconName, IconComponent)
          )}
        </div>
        <h4>Other icons</h4>
        <div className="grid grid-cols-8 gap-10">
          {otherIcons.map(([iconName, IconComponent]) =>
            IconTile(iconName, IconComponent)
          )}
        </div>
      </div>
    </div>
  );
}
